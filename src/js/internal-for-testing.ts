// If you want to test an internal API, add a binding into this file
//
// Then at test time: import {} from "bun:internal-for-testing"
//
// In a debug build, the import is always allowed. In release:
// $ BUN_GARBAGE_COLLECTOR_LEVEL=0 BUN_EXPOSE_TESTING_INTERNALS=1 bun test

export const quickAndDirtyJavaScriptSyntaxHighlighter = //
  $newZigFunction("fmt.zig", "QuickAndDirtyJavaScriptSyntaxHighlighter.jsFunctionSyntaxHighlight", 2) as (
    code: string,
  ) => string;

export const TLSBinding = $cpp("NodeTLS.cpp", "createNodeTLSBinding");

export const SQL = $cpp("JSSQLStatement.cpp", "createJSSQLStatementConstructor");
