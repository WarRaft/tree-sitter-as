#include "tree_sitter/parser.h"

enum TokenType {
    ADJACENT_STRINGS,
};

// Skip whitespace between strings, using non-skip advance to include in token
static bool skip_whitespace_non_skip(TSLexer *lexer) {
    bool skipped = false;
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
           lexer->lookahead == '\n' || lexer->lookahead == '\r') {
        lexer->advance(lexer, false);
        skipped = true;
    }
    return skipped;
}

// Try to scan a double-quoted string: "..."
// Returns true if successful, advances the lexer past the closing quote
static bool scan_double_quoted_string(TSLexer *lexer) {
    if (lexer->lookahead != '"') return false;
    lexer->advance(lexer, false); // consume opening "

    // Check for triple-quoted string """..."""
    if (lexer->lookahead == '"') {
        lexer->advance(lexer, false);
        if (lexer->lookahead == '"') {
            // Triple-quoted string
            lexer->advance(lexer, false); // consume third opening "
            // Scan until """
            int quote_count = 0;
            while (lexer->lookahead != 0) {
                if (lexer->lookahead == '"') {
                    quote_count++;
                    lexer->advance(lexer, false);
                    if (quote_count == 3) {
                        return true;
                    }
                } else {
                    quote_count = 0;
                    lexer->advance(lexer, false);
                }
            }
            return false; // unterminated triple-quoted string
        }
        // Empty string "" — that's fine, the second " was the closing quote
        // But we already consumed two quotes. The first was opening, second was closing.
        // Actually: first " = opening, second " = closing (empty string "")
        return true;
    }

    // Regular double-quoted string
    while (lexer->lookahead != 0) {
        if (lexer->lookahead == '\\') {
            lexer->advance(lexer, false); // backslash
            if (lexer->lookahead != 0) {
                lexer->advance(lexer, false); // escaped char
            }
        } else if (lexer->lookahead == '"') {
            lexer->advance(lexer, false); // closing "
            return true;
        } else {
            lexer->advance(lexer, false);
        }
    }
    return false; // unterminated string
}

// Try to scan a single-quoted string: '...'
static bool scan_single_quoted_string(TSLexer *lexer) {
    if (lexer->lookahead != '\'') return false;
    lexer->advance(lexer, false); // consume opening '
    while (lexer->lookahead != 0) {
        if (lexer->lookahead == '\\') {
            lexer->advance(lexer, false);
            if (lexer->lookahead != 0) {
                lexer->advance(lexer, false);
            }
        } else if (lexer->lookahead == '\'') {
            lexer->advance(lexer, false); // closing '
            return true;
        } else {
            lexer->advance(lexer, false);
        }
    }
    return false; // unterminated string
}

// Scan any string literal (double, single, or triple-quoted)
static bool scan_any_string(TSLexer *lexer) {
    return scan_double_quoted_string(lexer) || scan_single_quoted_string(lexer);
}

void *tree_sitter_angelscript_external_scanner_create(void) {
    return NULL;
}

void tree_sitter_angelscript_external_scanner_destroy(void *payload) {
}

unsigned tree_sitter_angelscript_external_scanner_serialize(void *payload, char *buffer) {
    return 0;
}

void tree_sitter_angelscript_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
}

bool tree_sitter_angelscript_external_scanner_scan(
    void *payload,
    TSLexer *lexer,
    const bool *valid_symbols
) {
    if (!valid_symbols[ADJACENT_STRINGS]) {
        return false;
    }

    // Skip leading whitespace (extras) — these are not part of the token
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
           lexer->lookahead == '\n' || lexer->lookahead == '\r') {
        lexer->advance(lexer, true);
    }

    // We need to find at least one string literal
    if (lexer->lookahead != '"' && lexer->lookahead != '\'') return false;

    // Scan the first string
    if (!scan_any_string(lexer)) return false;

    // Save position after first string
    lexer->mark_end(lexer);

    // Look ahead for more adjacent strings (with optional whitespace between)
    int string_count = 1;
    while (true) {
        // Skip whitespace between strings — include in token (advance with false)
        skip_whitespace_non_skip(lexer);

        // Check for another string
        if (lexer->lookahead != '"' && lexer->lookahead != '\'') break;

        if (!scan_any_string(lexer)) break;

        string_count++;
        lexer->mark_end(lexer);
    }

    if (string_count >= 1) {
        lexer->result_symbol = ADJACENT_STRINGS;
        return true;
    }

    return false;
}

