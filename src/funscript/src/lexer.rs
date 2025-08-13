// src/lexer.rs
#[derive(Debug, Clone, PartialEq)]
pub enum TokenKind {
    // Single‑character symbols
    LParen, RParen,         // ( )
    LBrace, RBrace,         // { }
    Comma, Semicolon,       // , ;
    // Operators
    Plus, Minus, Star, Slash, Percent,
    Eq, EqEq, BangEq,
    Lt, Gt, LtEq, GtEq,
    AndAnd, OrOr,
    // Literals
    Number(f64),
    String(String),
    // Keywords
    Fn, Let, If, Else, Return,
    // Identifier
    Ident(String),
    // End of input
    Eof,
}

#[derive(Debug, Clone)]
pub struct Token {
    pub kind: TokenKind,
    pub span: std::ops::Range<usize>, // byte offsets in the source
}

pub struct Lexer<'a> {
    src: &'a str,
    chars: std::iter::Peekable<std::str::CharIndices<'a>>,
    pos: usize,
}

impl<'a> Lexer<'a> {
    pub fn new(src: &'a str) -> Self {
        Lexer {
            src,
            chars: src.char_indices().peekable(),
            pos: 0,
        }
    }

    // --- Public API ---------------------------------------------------------
    pub fn next_token(&mut self) -> Token {
        self.skip_whitespace_and_comments();

        let start = self.pos;
        let (i, ch) = match self.chars.next() {
            Some(v) => v,
            None => return self.make_token(TokenKind::Eof, start..start),
        };
        self.pos = i + ch.len_utf8();

        match ch {
            // ----- punctuation -------------------------------------------------
            '(' => self.make_token(TokenKind::LParen, i..self.pos),
            ')' => self.make_token(TokenKind::RParen, i..self.pos),
            '{' => self.make_token(TokenKind::LBrace, i..self.pos),
            '}' => self.make_token(TokenKind::RBrace, i..self.pos),
            ',' => self.make_token(TokenKind::Comma, i..self.pos),
            ';' => self.make_token(TokenKind::Semicolon, i..self.pos),

            // ----- operators ---------------------------------------------------
            '+' => self.make_token(TokenKind::Plus, i..self.pos),
            '-' => self.make_token(TokenKind::Minus, i..self.pos),
            '*' => self.make_token(TokenKind::Star, i..self.pos),
            '/' => self.make_token(TokenKind::Slash, i..self.pos),
            '%' => self.make_token(TokenKind::Percent, i..self.pos),

            '=' => {
                if self.peek_eq('=') {
                    self.consume(); // second '='
                    self.make_token(TokenKind::EqEq, i..self.pos)
                } else {
                    self.make_token(TokenKind::Eq, i..self.pos)
                }
            }
            '!' => {
                if self.peek_eq('=') {
                    self.consume();
                    self.make_token(TokenKind::BangEq, i..self.pos)
                } else {
                    // For simplicity we don’t have a unary ! token; you can add it later.
                    panic!("Unexpected '!'");
                }
            }
            '<' => {
                if self.peek_eq('=') {
                    self.consume();
                    self.make_token(TokenKind::LtEq, i..self.pos)
                } else {
                    self.make_token(TokenKind::Lt, i..self.pos)
                }
            }
            '>' => {
                if self.peek_eq('=') {
                    self.consume();
                    self.make_token(TokenKind::GtEq, i..self.pos)
                } else {
                    self.make_token(TokenKind::Gt, i..self.pos)
                }
            }
            '&' => {
                if self.peek_eq('&') {
                    self.consume();
                    self.make_token(TokenKind::AndAnd, i..self.pos)
                } else {
                    panic!("Unexpected '&'");
                }
            }
            '|' => {
                if self.peek_eq('|') {
                    self.consume();
                    self.make_token(TokenKind::OrOr, i..self.pos)
                } else {
                    panic!("Unexpected '|'");
                }
            }

            // ----- literals ----------------------------------------------------
            '"' => self.lex_string(i),
            c if c.is_ascii_digit() => self.lex_number(i),
            c if Self::is_ident_start(c) => self.lex_ident_or_keyword(i),

            // ----- anything else ------------------------------------------------
            _ => panic!("Unexpected character `{}` at {}", ch, i),
        }
    }

    // -------------------------------------------------------------------------
    // Helper functions
    fn make_token(&self, kind: TokenKind, span: std::ops::Range<usize>) -> Token {
        Token { kind, span }
    }

    fn skip_whitespace_and_comments(&mut self) {
        while let Some(&(_, ch)) = self.chars.peek() {
            if ch.is_whitespace() {
                self.consume();
                continue;
            }
            // line comment `// …`
            if ch == '/' {
                let (_, next) = self.chars.clone().nth(1).unwrap_or((self.pos, '\0'));
                if next == '/' {
                    // consume until newline or EOF
                    self.consume(); // first '/'
                    self.consume(); // second '/'
                    while let Some(&(_, c)) = self.chars.peek() {
                        if c == '\n' {
                            break;
                        }
                        self.consume();
                    }
                    continue;
                }
            }
            break;
        }
    }

    fn peek_eq(&mut self, expected: char) -> bool {
        matches!(self.chars.peek(), Some(&(_, c)) if c == expected)
    }

    fn consume(&mut self) {
        if let Some((i, ch)) = self.chars.next() {
            self.pos = i + ch.len_utf8();
        }
    }

    // ----- number literal ----------------------------------------------------
    fn lex_number(&mut self, start_idx: usize) -> Token {
        let mut end = start_idx;
        while let Some(&(_, c)) = self.chars.peek() {
            if c.is_ascii_digit() || c == '.' {
                let (i, _) = self.chars.next().unwrap();
                end = i + 1;
            } else {
                break;
            }
        }
        let literal = &self.src[start_idx..end];
        let value: f64 = literal.parse().expect("Invalid number literal");
        Token {
            kind: TokenKind::Number(value),
            span: start_idx..end,
        }
    }

    // ----- string literal ----------------------------------------------------
    fn lex_string(&mut self, start_idx: usize) -> Token {
        let mut end = start_idx + 1; // skip opening quote
        let mut content = String::new();
        while let Some((i, ch)) = self.chars.next() {
            end = i + ch.len_utf8();
            match ch {
                '"' => break,
                '\\' => {
                    // simple escape handling
                    let (_, esc) = self.chars.next().expect("Unfinished escape");
                    let esc_char = match esc {
                        'n' => '\n',
                        't' => '\t',
                        '"' => '"',
                        '\\' => '\\',
                        other => panic!("Unsupported escape '\\{}'", other),
                    };
                    content.push(esc_char);
                }
                _ => content.push(ch),
            }
        }
        Token {
            kind: TokenKind::String(content),
            span: start_idx..end,
        }
    }

    // ----- identifier / keyword -----------------------------------------------
    fn is_ident_start(ch: char) -> bool {
        ch.is_ascii_alphabetic() || ch == '_' || ch == '$'
    }
    fn is_ident_continue(ch: char) -> bool {
        ch.is_ascii_alphanumeric() || ch == '_' || ch == '$'
    }

    fn lex_ident_or_keyword(&mut self, start_idx: usize) -> Token {
        let mut end = start_idx;
        while let Some(&(_, c)) = self.chars.peek() {
            if Self::is_ident_continue(c) {
                let (i, _) = self.chars.next().unwrap();
                end = i + 1;
            } else {
                break;
            }
        }
        let ident = &self.src[start_idx..end];
        let kind = match ident {
            "fn" => TokenKind::Fn,
            "let" => TokenKind::Let,
            "if" => TokenKind::If,
            "else" => TokenKind::Else,
            "return" => TokenKind::Return,
            _ => TokenKind::Ident(ident.to_string()),
        };
        Token {
            kind,
            span: start_idx..end,
        }
    }
}