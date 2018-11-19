/*
 * Grammar file.
 * Pass this to Jison to generate the parser file.
 */

%lex

%%

"#".*($|\r\n|\r|\n)                   %{
                                         if (yytext.match(/\r|\n/)) {
                                             parser.newLine = true;
                                         }
                                         if (parser.restricted && parser.newLine) {
                                             this.unput(yytext);
                                             parser.restricted = false;
                                         }
                                         return "COMMENT";
                                      %}

\s+                                   /* skip other whitespace */

\([^\)]*\)                            return "PARAMS";
[A-Za-z\_\$][A-Za-z0-9_\$]*           return "LABEL";
"{"                                   return "{";
"}"                                   return "}";

<<EOF>>                               return "EOF";

%%

/lex

%start Root

%%

Root
  : RootBody EOF
    {
      $$ = new RootNode($1, createSourceLocation(null, @1, @2));
      return $$;
    }
  ;

RootBody
  : RootBody SourceElement
    {
      $$ = $1.concat($2);
    }
  | /* Empty */
    {
      $$ = [];
    }
  ;

SourceElement
  : CommentLine
  | Block
  ;

CommentLine
  : COMMENT
    {
      $$ = new CommentNode($1, createSourceLocation($1, @1, @1));
    }
  ;

Block
  : "{" BlockElements "}"
    {
      $$ = new BlockNode($2, createSourceLocation(null, @1, @3));
    }
  ;

BlockElements
  : BlockElements BlockElement
    {
      $$ = $1.concat($2);
    }
  | /* Empty */
    {
      $$ = []
    }
  ;

BlockElement
  : CommentLine
  | DataSpec
  ;

DataSpec
  : LABEL Block
    {
      $$ = new DataSpecNode($1, '', $2, createSourceLocation(null, @1, @2));
    }
  | LABEL PARAMS Block
    {
      $$ = new DataSpecNode($1, $2, $3, createSourceLocation(null, @1, @3));
    }
  | LABEL PARAMS
    {
      $$ = new DataSpecNode($1, $2, null, createSourceLocation(null, @1, @2));
    }
  | LABEL
    {
      $$ = new DataSpecNode($1, '', null, createSourceLocation(null, @1, @1));
    }
  ;

%%

function createSourceLocation(source, firstToken, lastToken) {
    return new SourceLocation(
        source,
        new Position(
            firstToken.first_line,
            firstToken.first_column
        ),
        new Position(
            lastToken.last_line,
            lastToken.last_column
        )
    );
}

function Position(line, column) {
  this.line   = line;
  this.column = column;
}

function SourceLocation(source, start, end) {
  this.source = source;
  this.start  = start;
  this.end    = end;
}

function RootNode(body, location) {
  this.type = "Root";
  this.body = body;
  this.location = location;
}

function CommentNode(text, location) {
  this.type = 'Comment';
  this.text = text;
  this.location = location;
}

function BlockNode(body, location) {
  this.type = 'Block';
  this.body = body;
  this.location = location;
}

function DataSpecNode(label, params, block, location) {
  this.type = 'DataSpec';
  this.label = label;
  this.params = params.replace(/^\(|\)$/g, '').trim();
  this.body = block;
  this.location = location;
}

parser.nodes = {
  RootNode: RootNode,
  CommentNode: CommentNode,
  BlockNode: BlockNode,
  DataSpecNode: DataSpecNode
}
