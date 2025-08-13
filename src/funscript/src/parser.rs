// src/parser.rs
use crate::lexer::{Lexer, Token, TokenKind};
use crate::ast::{Expr, Stmt, BinOp, UnOp};

#[derive(Debug)]
pub enum ParseError {
    UnexpectedToken { expected: String, found: TokenKind },
    UnexpectedEof,
    // … you can add more detailed variants later
}

type ParseResult<T> = Result<T, ParseError>;

pub struct Parser<'a> {
    lexer: Lexer<'a>,
    lookahead: Token,
}

impl<'a> Parser<'a> {
    // -------------------------------------------------------------------------
    pub fn new(src: &'a str) -> Self {
        let mut lexer = Lexer::new(src);
        let lookahead = lexer.next_token();
        Parser { lexer, lookahead }
    }

    // -------------------------------------------------------------------------
    // Utility helpers
    fn advance(&mut self) {
        self.lookahead = self.lexer.next_token();
    }

    fn peek(&self) -> &TokenKind {
        &self.lookahead.kind
    }

    fn expect(&mut self, expected: TokenKind) -> ParseResult<Token> {
        if self.lookahead.kind == expected {
            let tok = self.lookahead.clone();
            self.advance();
            Ok(tok)
        } else {
            Err(ParseError::UnexpectedToken {
                expected: format!("{:?}", expected),
                found: self.lookahead.kind.clone(),
            })
        }
    }

    fn expect_ident(&mut self) -> ParseResult<String> {
        match &self.lookahead.kind {
            TokenKind::Ident(name) => {
                let name = name.clone();
                self.advance();
                Ok(name)
            }
            other => Err(ParseError::UnexpectedToken {
                expected: "identifier".into(),
                found: other.clone(),
            }),
        }
    }

    // -------------------------------------------------------------------------
    // Entry point – parse a whole source file (a sequence of statements/exprs).
    pub fn parse(&mut self) -> ParseResult<Vec<Stmt>> {
        let mut stmts = Vec::new();
        while self.lookahead.kind != TokenKind::Eof {
            stmts.push(self.parse_stmt()?);
        }
        Ok(stmts)
    }

    // -------------------------------------------------------------------------
    // Statements
    fn parse_stmt(&mut self) -> ParseResult<Stmt> {
        match self.peek() {
            TokenKind::Let => self.parse_let_stmt(),
            TokenKind::Return => self.parse_return_stmt(),
            _ => {
                // Expression statement (e.g., a function call)
                let expr = self.parse_expr(0)?;
                // Optional terminating semicolon
                if let TokenKind::Semicolon = self.peek() {
                    self.advance();
                }
                Ok(Stmt::Expr(expr))
            }
        }
    }

    fn parse_let_stmt(&mut self) -> ParseResult<Stmt> {
        self.expect(TokenKind::Let)?;
        let name = self.expect_ident()?;
        self.expect(TokenKind::Eq)?;
        let init = self.parse_expr(0)?;
        // `let` can be used as a statement; we require a trailing semicolon.
        if let TokenKind::Semicolon = self.peek() {
            self.advance();
        }
        Ok(Stmt::Let { name, init })
    }

    fn parse_return_stmt(&mut self) -> ParseResult<Stmt> {
        self.expect(TokenKind::Return)?;
        let expr = self.parse_expr(0)?;
        if let TokenKind::Semicolon = self.peek() {
            self.advance();
        }
        Ok(Stmt::Return(expr))
    }

    // -------------------------------------------------------------------------
    // Expression parsing (Pratt)
    fn parse_expr(&mut self, min_prec: u8) -> ParseResult<Expr> {
        // Parse a prefix expression (primary, unary, etc.)
        let mut left = self.parse_prefix()?;

        // Then parse binary operators while they have higher/equal precedence.
        loop {
            let op_prec = self.binop_precedence();
            if op_prec < min_prec {
                break;
            }

            // Grab the operator token
            let op_token = self.lookahead.clone();
            self.advance(); // consume operator

            // Right‑hand side: the precedence we pass is `op_prec + 1`
            // to enforce left‑associativity (except for right‑assoc operators like `**` if you add any).
            let rhs = self.parse_expr(op_prec + 1)?;

            left = Expr::Binary {
                left: Box::new(left),
                op: Self::token_to_binop(&op_token.kind)?,
                right: Box::new(rhs),
            };
        }

        Ok(left)
    }

    // -------------------------------------------------------------------------
    // Prefix (primary, unary, etc.)
    fn parse_prefix(&mut self) -> ParseResult<Expr> {
        match self.peek() {
            TokenKind::Number(n) => {
                let v = *n;
                self.advance();
                Ok(Expr::Number(v))
            }
            TokenKind::String(s) => {
                let v = s.clone();
                self.advance();
                Ok(Expr::String(v))
            }
            TokenKind::Ident(name) => {
                let ident = name.clone();
                self.advance();

                // Could be a function call if the next token is '('
                if let TokenKind::LParen = self.peek() {
                    self.advance(); // consume '('
                    let args = self.parse_comma_separated(|p| p.parse_expr(0))?;
                    self.expect(TokenKind::RParen)?;
                    Ok(Expr::Call {
                        callee: Box::new(Expr::Ident(ident)),
                        args,
                    })
                } else {
                    Ok(Expr::Ident(ident))
                }
            }
            TokenKind::LParen => {
                self.advance(); // '('
                let expr = self.parse_expr(0)?;
                self.expect(TokenKind::RParen)?;
                Ok(expr)
            }
            TokenKind::LBrace => self.parse_block(),
            TokenKind::If => self.parse_if(),
            TokenKind::Fn => self.parse_fn_literal(),
            TokenKind::Minus => {
                // unary minus
                self.advance();
                let expr = self.parse_expr(10)?; // give unary high precedence
                Ok(Expr::Unary {
                    op: UnOp::Neg,
                    expr: Box::new(expr),
                })
            }
            other => Err(ParseError::UnexpectedToken {
                expected: "expression".into(),
                found: other.clone(),
            }),
        }
    }

    // -------------------------------------------------------------------------
    // Helpers for specific constructs
    fn parse_block(&mut self) -> ParseResult<Expr> {
        self.expect(TokenKind::LBrace)?;
        let mut stmts = Vec::new();
        let mut tail = None;

        while self.peek() != &TokenKind::RBrace && self.peek() != &TokenKind::Eof {
            // Decide if we have a statement or a trailing expression.
            // A simple heuristic: if the next token starts a statement keyword,
            // treat it as a statement; otherwise parse as expression.
            match self.peek() {
                TokenKind::Let | TokenKind::Return => {
                    stmts.push(self.parse_stmt()?);
                }
                _ => {
                    // Peek ahead to see if a semicolon follows – that means it's an expr stmt.
                    let saved = self.lookahead.clone();
                    let expr = self.parse_expr(0)?;
                    match self.peek() {
                        TokenKind::Semicolon => {
                            self.advance(); // eat `;`
                            stmts.push(Stmt::Expr(expr));
                        }
                        TokenKind::RBrace => {
                            // No semicolon → this is the block's value
                            tail = Some(Box::new(expr));
                            break;
                        }
                        _ => {
                            // In most cases we fallback to expression statement.
                            stmts.push(Stmt::Expr(expr));
                        }
                    }
                    self.lookahead = saved; // just to keep the flow; not needed in this simplified version
                }
            }
        }

        self.expect(TokenKind::RBrace)?;
        Ok(Expr::Block { stmts, tail })
    }

    fn parse_if(&mut self) -> ParseResult<Expr> {
        self.expect(TokenKind::If)?;
        self.expect(TokenKind::LParen)?;
        let cond = self.parse_expr(0)?;
        self.expect(TokenKind::RParen)?;
        let then_branch = self.parse_expr(0)?; // allow block or single expr
        let else_branch = if let TokenKind::Else = self.peek() {
            self.advance();
            Some(Box::new(self.parse_expr(0)?))
        } else {
            None
        };
        Ok(Expr::If {
            cond: Box::new(cond),
            then_branch: Box::new(then_branch),
            else_branch,
        })
    }

    fn parse_fn_literal(&mut self) -> ParseResult<Expr> {
        self.expect(TokenKind::Fn)?;
        self.expect(TokenKind::LParen)?;
        let params = self.parse_comma_separated(|p| p.expect_ident())?;
        self.expect(TokenKind::RParen)?;
        // Function body can be a block or a single expression.
        let body = self.parse_expr(0)?;
        Ok(Expr::Fn {
            params,
            body: Box::new(body),
        })
    }

    // -------------------------------------------------------------------------
    // Helper: parse a comma‑separated list, used for arguments and parameters.
    fn parse_comma_separated<T, F>(&mut self, mut parser: F) -> ParseResult<Vec<T>>
    where
        F: FnMut(&mut Parser<'a>) -> ParseResult<T>,
    {
        let mut items = Vec::new();
        // Allow empty list
        if let TokenKind::RParen = self.peek() {
            return Ok(items);
        }

        loop {
            items.push(parser(self)?);
            match self.peek() {
                TokenKind::Comma => {
                    self.advance(); // eat ','
                }
                TokenKind::RParen => break,
                other => {
                    return Err(ParseError::UnexpectedToken {
                        expected: "',' or ')'".into(),
                        found: other.clone(),
                    })
                }
            }
        }
        Ok(items)
    }

    // -------------------------------------------------------------------------
    // Operator precedence table (higher number = tighter binding)
    fn binop_precedence(&self) -> u8 {
        match self.peek() {
            TokenKind::OrOr => 1,
            TokenKind::AndAnd => 2,
            TokenKind::EqEq | TokenKind::BangEq => 3,
            TokenKind::Lt | TokenKind::Gt | TokenKind::LtEq | TokenKind::GtEq => 4,
            TokenKind::Plus | TokenKind::Minus => 5,
            TokenKind::Star | TokenKind::Slash | TokenKind::Percent => 6,
            _ => 0, // not a binary operator
        }
    }

    fn token_to_binop(tok: &TokenKind) -> ParseResult<BinOp> {
        match tok {
            TokenKind::Plus => Ok(BinOp::Add),
            TokenKind::Minus => Ok(BinOp::Sub),
            TokenKind::Star => Ok(BinOp::Mul),
            TokenKind::Slash => Ok(BinOp::Div),
            TokenKind::Percent => Ok(BinOp::Mod),
            TokenKind::EqEq => Ok(BinOp::Eq),
            TokenKind::BangEq => Ok(BinOp::Ne),
            TokenKind::Lt => Ok(BinOp::Lt),
            TokenKind::Gt => Ok(BinOp::Gt),
            TokenKind::LtEq => Ok(BinOp::Le),
            TokenKind::GtEq => Ok(BinOp::Ge),
            TokenKind::AndAnd => Ok(BinOp::And),
            TokenKind::OrOr => Ok(BinOp::Or),
            other => Err(ParseError::UnexpectedToken {
                expected: "binary operator".into(),
                found: other.clone(),
            }),
        }
    }
}