const { off } = require("process");

module.exports = {
  extends: "solhint:recommended",
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    "code-complexity": ["error", 10],
    "function-max-lines": ["error", 100],
    "max-line-length": ["error", 140],
    "max-states-count": ["error", 20],
    "no-empty-blocks": "off",
    "no-unused-vars": "error",
    "payable-fallback": "off",
    "reason-string": ["off", { maxLength: 32 }],
    "constructor-syntax": "off",
    "comprehensive-interface": "off",
    quotes: ["error", "double"],
    "const-name-snakecase": "error",
    "contract-name-camelcase": "error",
    "event-name-camelcase": "error",
    "func-name-mixedcase": "error",
    "func-param-name-mixedcase": "error",
    "modifier-name-mixedcase": "error",
    "private-vars-leading-underscore": ["error", { strict: false }],
    "var-name-mixedcase": "error",
    "imports-on-top": "error",
    ordering: "error",
    "visibility-modifier-order": "error",
    "avoid-call-value": "off",
    "avoid-low-level-calls": "off",
    "avoid-sha3": "error",
    "avoid-suicide": "error",
    "avoid-throw": "error",
    "avoid-tx-origin": "off",
    "check-send-result": "error",
    "compiler-version": ["error", ">=0.6.0"],
    "mark-callable-contracts": "off",
    "func-visibility": ["error", { ignoreConstructors: true }],
    "multiple-sends": "error",
    "no-complex-fallback": "error",
    "no-inline-assembly": "off",
    "not-rely-on-block-hash": "error",
    reentrancy: "error",
    "state-visibility": "error",
    "not-rely-on-time": "off",
  },
};
