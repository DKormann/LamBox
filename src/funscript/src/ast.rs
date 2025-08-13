// src/ast.rs
#[derive(Debug, Clone, PartialEq)]
pub enum Expr {
    Number(f64),
    String(String),
    Ident(String),

    // Binary expression: left op right
    Binary {
        left: Box<Expr>,
        op: BinOp,
        right: Box<Expr>,
    },

    // Function call: callee(args...)
    Call {
        callee: Box<Expr>,
        args: Vec<Expr>,
    },

    // Block: { stmt* expr? }
    Block {
        stmts: Vec<Stmt>,
        tail: Option<Box<Expr>>,
    },

    // If expression
    If {
        cond: Box<Expr>,
        then_branch: Box<Expr>,
        else_branch: Option<Box<Expr>>,
    },

    // Function literal (anonymous)
    Fn {
        params: Vec<String>,
        body: Box<Expr>, // we treat the body as an expression (block allowed)
    },

    // Unary (e.g., `-expr`).  We’ll only need `Neg` for now.
    Unary {
        op: UnOp,
        expr: Box<Expr>,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub enum BinOp {
    Add,
    Sub,
    Mul,
    Div,
    Mod,
    Eq,
    Ne,
    Lt,
    Gt,
    Le,
    Ge,
    And,
    Or,
}

#[derive(Debug, Clone, PartialEq)]
pub enum UnOp {
    Neg,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Stmt {
    Let {
        name: String,
        init: Expr,
    },
    Expr(Expr), // expression statement (e.g., function call)
    Return(Expr),
}