/**
 * Tree-sitter grammar for AngelScript
 *
 * AngelScript is a statically typed scripting language designed for embedding
 * in applications (e.g., games using Angelscript). It has C-like syntax with
 * classes, interfaces, enums, templates, and optional types.
 *
 * Reference: https://www.angelcode.com/angelscript/sdk/docs/manual/doc_script.html
 */

// Operator precedence (higher = tighter binding)
const PREC = {
    ASSIGNMENT: 1,       // = += -= *= /= %= **= &= |= ^= <<= >>= >>>=
    TERNARY: 2,          // ?:
    LOGICAL_OR: 3,       // ||
    LOGICAL_AND: 4,      // &&
    BITWISE_OR: 5,       // |
    BITWISE_XOR: 6,      // ^
    BITWISE_AND: 7,      // &
    EQUALITY: 8,         // == != is !is
    RELATIONAL: 9,       // < > <= >= (xor)
    BITSHIFT: 10,        // << >> >>>
    ADDITIVE: 11,        // + -
    MULTIPLICATIVE: 12,  // * / %
    POWER: 13,           // **
    UNARY: 14,           // ! - + ~ ++ -- cast
    POSTFIX: 15,         // ++ --
    CALL: 16,            // f() a[] a.b
    MEMBER: 17,          // . ::
}

module.exports = grammar({
    name: 'angelscript',

    extras: $ => [
        /\s/,
        $.comment,
        $.block_comment,
    ],

    word: $ => $.identifier,

    conflicts: $ => [
        [$.function_call, $.primary_expression],
        [$.variable_declaration, $.expression_statement],
        [$.type, $.expression],
        [$.namespace_access, $.member_access],
        [$.function_declaration, $.variable_declaration],
        [$.primary_expression, $.scoped_name],
        [$.block, $.initializer_list],
    ],

    rules: {
        // ─── Top-level ──────────────────────────────────────────────────────────

        script: $ => repeat($._top_level_statement),

        _top_level_statement: $ => choice(
            $.import_declaration,
            $.include_directive,
            $.function_declaration,
            $.class_declaration,
            $.interface_declaration,
            $.enum_declaration,
            $.mixin_declaration,
            $.namespace_declaration,
            $.typedef_declaration,
            $.funcdef_declaration,
            $.variable_declaration_statement,
            $.metadata,
            $.semicolon,
        ),

        // ─── Preprocessor / import ──────────────────────────────────────────────

        include_directive: $ => seq(
            '#include',
            field('path', $.string_literal),
        ),

        import_declaration: $ => prec.right(seq(
            'import',
            field('return_type', $.type),
            field('name', $.identifier),
            '(',
            field('params', optional($.parameter_list)),
            ')',
            'from',
            field('module', $.string_literal),
            optional($.semicolon),
        )),

        // ─── Namespace ──────────────────────────────────────────────────────────

        namespace_declaration: $ => seq(
            'namespace',
            field('name', $.scoped_name),
            '{',
            repeat($._top_level_statement),
            '}',
        ),

        // ─── typedef / funcdef ──────────────────────────────────────────────────

        typedef_declaration: $ => prec.right(seq(
            'typedef',
            field('base', $.type),
            field('alias', $.identifier),
            optional($.semicolon),
        )),

        funcdef_declaration: $ => prec.right(seq(
            optional('shared'),
            'funcdef',
            field('return_type', $.type),
            field('name', $.identifier),
            '(',
            field('params', optional($.parameter_list)),
            ')',
            optional($.semicolon),
        )),

        // ─── Enum ───────────────────────────────────────────────────────────────

        enum_declaration: $ => seq(
            optional('shared'),
            optional('external'),
            'enum',
            field('name', $.identifier),
            optional($.metadata),
            '{',
            optional($.enum_body),
            '}',
        ),

        enum_body: $ => seq(
            $.enum_member,
            repeat(seq(',', $.enum_member)),
            optional(','),
        ),

        enum_member: $ => seq(
            optional($.metadata),
            field('name', $.identifier),
            optional(seq('=', field('value', $.expression))),
        ),

        // ─── Interface ──────────────────────────────────────────────────────────

        interface_declaration: $ => seq(
            optional('shared'),
            optional('external'),
            'interface',
            field('name', $.identifier),
            optional(seq(':', field('bases', $.base_list))),
            optional($.metadata),
            '{',
            repeat($._interface_member),
            '}',
        ),

        _interface_member: $ => choice(
            $.interface_method,
            $.variable_declaration_statement,
            $.semicolon,
        ),

        interface_method: $ => prec.right(seq(
            field('return_type', $.type),
            field('name', $.identifier),
            '(',
            field('params', optional($.parameter_list)),
            ')',
            optional($.const_qualifier),
            optional($.metadata),
            optional($.semicolon),
        )),

        // ─── Mixin ──────────────────────────────────────────────────────────────

        mixin_declaration: $ => seq(
            'mixin',
            field('class', $.class_declaration),
        ),

        // ─── Class ──────────────────────────────────────────────────────────────

        class_declaration: $ => seq(
            optional('shared'),
            optional('abstract'),
            optional('final'),
            optional('external'),
            'class',
            field('name', $.identifier),
            optional(seq(':', field('bases', $.base_list))),
            optional($.metadata),
            '{',
            repeat($._class_member),
            '}',
        ),

        base_list: $ => seq(
            $.scoped_name,
            repeat(seq(',', $.scoped_name)),
        ),

        _class_member: $ => choice(
            $.function_declaration,
            $.variable_declaration_statement,
            $.access_modifier,
            $.semicolon,
        ),

        access_modifier: $ => seq(
            choice('private', 'protected', 'public'),
            ':',
        ),


        // ─── Function ───────────────────────────────────────────────────────────

        function_declaration: $ => seq(
            repeat($._modifier),
            optional(field('return_type', $.type)),
            field('name', choice($.identifier, $.destructor_name)),
            '(',
            field('params', optional($.parameter_list)),
            ')',
            optional($.const_qualifier),
            optional($.override_qualifier),
            optional($.metadata),
            choice($.block, $.semicolon),
        ),

        destructor_name: $ => seq('~', $.identifier),

        _modifier: $ => choice(
            'private',
            'protected',
            'public',
            'override',
            'explicit',
        ),


        const_qualifier: _ => 'const',
        override_qualifier: _ => choice('override', 'final', 'delete'),

        parameter_list: $ => seq(
            $.parameter,
            repeat(seq(',', $.parameter)),
        ),

        parameter: $ => seq(
            field('type', $.type),
            optional(field('name', $.identifier)),
            optional(seq('=', field('default', $.expression))),
        ),

        // ─── Metadata ───────────────────────────────────────────────────────────

        metadata: $ => seq(
            '[',
            $.string_literal,
            repeat(seq(',', $.string_literal)),
            ']',
        ),

        // ─── Statements ─────────────────────────────────────────────────────────

        block: $ => prec(1, seq(
            '{',
            repeat($._statement),
            '}',
        )),

        _statement: $ => choice(
            $.block,
            $.if_statement,
            $.while_statement,
            $.do_while_statement,
            $.for_statement,
            $.foreach_statement,
            $.switch_statement,
            $.return_statement,
            $.break_statement,
            $.continue_statement,
            $.try_statement,
            $.throw_statement,
            $.variable_declaration_statement,
            $.expression_statement,
            $.semicolon,
        ),

        if_statement: $ => prec.right(seq(
            'if',
            '(',
            field('condition', $.expression),
            ')',
            field('consequence', $._statement),
            optional(seq('else', field('alternative', $._statement))),
        )),

        while_statement: $ => seq(
            'while',
            '(',
            field('condition', $.expression),
            ')',
            field('body', $._statement),
        ),

        do_while_statement: $ => prec.right(seq(
            'do',
            field('body', $._statement),
            'while',
            '(',
            field('condition', $.expression),
            ')',
            optional($.semicolon),
        )),

        for_statement: $ => seq(
            'for',
            '(',
            optional(choice($.variable_declaration_statement, $.expression_statement)),
            field('condition', optional($.expression)),
            $.semicolon,
            field('update', optional($.expression_list)),
            ')',
            field('body', $._statement),
        ),

        foreach_statement: $ => seq(
            'for',
            '(',
            field('type', $.type),
            field('name', $.identifier),
            'in',
            field('iterable', $.expression),
            ')',
            field('body', $._statement),
        ),

        switch_statement: $ => seq(
            'switch',
            '(',
            field('value', $.expression),
            ')',
            '{',
            repeat($.switch_case),
            '}',
        ),

        switch_case: $ => choice(
            seq('case', field('value', $.expression), ':', repeat($._statement)),
            seq('default', ':', repeat($._statement)),
        ),

        return_statement: $ => prec.right(seq(
            'return',
            optional($.expression),
            optional($.semicolon),
        )),

        break_statement: $ => prec.right(seq('break', optional($.semicolon))),

        continue_statement: $ => prec.right(seq('continue', optional($.semicolon))),

        try_statement: $ => seq(
            'try',
            field('body', $.block),
            'catch',
            '(',
            field('exception', $.expression),
            ')',
            field('handler', $.block),
        ),

        throw_statement: $ => prec.right(seq(
            'throw',
            optional($.semicolon),
        )),

        variable_declaration_statement: $ => prec.right(seq(
            $.variable_declaration,
            optional($.semicolon),
        )),

        variable_declaration: $ => seq(
            field('type', $.type),
            $.declarator,
            repeat(seq(',', $.declarator)),
        ),

        declarator: $ => seq(
            field('name', $.identifier),
            optional(seq('=', field('value', $.expression))),
        ),

        expression_statement: $ => prec.right(seq(
            $.expression,
            optional($.semicolon),
        )),

        expression_list: $ => seq(
            $.expression,
            repeat(seq(',', $.expression)),
        ),

        // ─── Expressions ────────────────────────────────────────────────────────

        expression: $ => choice(
            $.assignment_expression,
            $.ternary_expression,
            $.binary_expression,
            $.unary_expression,
            $.postfix_expression,
            $.cast_expression,
            $.function_call,
            $.subscript_expression,
            $.member_access,
            $.namespace_access,
            $.handle_of_expression,
            $.lambda_expression,
            $.primary_expression,
        ),

        assignment_expression: $ => prec.right(PREC.ASSIGNMENT, seq(
            field('left', $.expression),
            field('operator', $.assignment_operator),
            field('right', $.expression),
        )),

        assignment_operator: _ => choice(
            '=', '+=', '-=', '*=', '/=', '%=', '**=',
            '&=', '|=', '^=', '<<=', '>>=', '>>>=',
        ),

        ternary_expression: $ => prec.right(PREC.TERNARY, seq(
            field('condition', $.expression),
            '?',
            field('consequence', $.expression),
            ':',
            field('alternative', $.expression),
        )),

        binary_expression: $ => choice(
            prec.left(PREC.LOGICAL_OR, seq(field('left', $.expression), field('operator', choice('||', 'or')), field('right', $.expression))),
            prec.left(PREC.LOGICAL_AND, seq(field('left', $.expression), field('operator', choice('&&', 'and')), field('right', $.expression))),
            prec.left(PREC.BITWISE_OR, seq(field('left', $.expression), field('operator', '|'), field('right', $.expression))),
            prec.left(PREC.BITWISE_XOR, seq(field('left', $.expression), field('operator', '^'), field('right', $.expression))),
            prec.left(PREC.BITWISE_AND, seq(field('left', $.expression), field('operator', '&'), field('right', $.expression))),
            prec.left(PREC.EQUALITY, seq(field('left', $.expression), field('operator', choice('==', '!=')), field('right', $.expression))),
            prec.left(PREC.EQUALITY, seq(field('left', $.expression), field('operator', 'is'), field('right', $.expression))),
            prec.left(PREC.EQUALITY, seq(field('left', $.expression), field('operator', seq('!', 'is')), field('right', $.expression))),
            prec.left(PREC.RELATIONAL, seq(field('left', $.expression), field('operator', choice('<', '>', '<=', '>=')), field('right', $.expression))),
            prec.left(PREC.RELATIONAL, seq(field('left', $.expression), field('operator', 'xor'), field('right', $.expression))),
            prec.left(PREC.BITSHIFT, seq(field('left', $.expression), field('operator', choice('<<', '>>', '>>>')), field('right', $.expression))),
            prec.left(PREC.ADDITIVE, seq(field('left', $.expression), field('operator', choice('+', '-')), field('right', $.expression))),
            prec.left(PREC.MULTIPLICATIVE, seq(field('left', $.expression), field('operator', choice('*', '/', '%')), field('right', $.expression))),
            prec.right(PREC.POWER, seq(field('left', $.expression), field('operator', '**'), field('right', $.expression))),
        ),

        unary_expression: $ => prec.right(PREC.UNARY, seq(
            field('operator', choice('!', 'not', '-', '+', '~', '++', '--')),
            field('operand', $.expression),
        )),

        postfix_expression: $ => prec.left(PREC.POSTFIX, seq(
            field('operand', $.expression),
            field('operator', choice('++', '--')),
        )),

        cast_expression: $ => prec(PREC.UNARY, choice(
            seq('cast', '<', field('type', $.type), '>', '(', field('value', $.expression), ')'),
            seq('opImplCast', '<', field('type', $.type), '>'),
        )),

        function_call: $ => prec.left(PREC.CALL, seq(
            field('callee', $.expression),
            '(',
            field('args', optional($.argument_list)),
            ')',
        )),

        argument_list: $ => seq(
            $.expression,
            repeat(seq(',', $.expression)),
        ),

        subscript_expression: $ => prec.left(PREC.CALL, seq(
            field('object', $.expression),
            '[',
            field('index', $.expression),
            ']',
        )),

        member_access: $ => prec.left(PREC.MEMBER, seq(
            field('object', $.expression),
            choice('.', '@.'),
            field('member', $.identifier),
        )),

        namespace_access: $ => prec.left(PREC.MEMBER, seq(
            field('namespace', $.identifier),
            '::',
            field('member', $.identifier),
        )),

        handle_of_expression: $ => prec.left(PREC.MEMBER, seq(
            field('operand', $.expression),
            '@',
        )),

        lambda_expression: $ => seq(
            'function',
            '(',
            field('params', optional($.parameter_list)),
            ')',
            optional($.const_qualifier),
            field('body', $.block),
        ),

        primary_expression: $ => choice(
            $.integer_literal,
            $.float_literal,
            $.hex_literal,
            $.bits_literal,
            $.string_literal,
            $.bool_literal,
            $.null_literal,
            $.this_expression,
            $.super_expression,
            $.identifier,
            $.parenthesized_expression,
            $.initializer_list,
            $.new_expression,
        ),

        parenthesized_expression: $ => seq('(', $.expression, ')'),

        initializer_list: $ => seq(
            '{',
            optional(seq(
                $.expression,
                repeat(seq(',', $.expression)),
            )),
            '}',
        ),

        new_expression: $ => seq(
            'new',
            field('type', $.type),
            '(',
            field('args', optional($.argument_list)),
            ')',
        ),

        void_expression: _ => 'void',
        this_expression: _ => 'this',
        super_expression: _ => 'super',
        null_literal: _ => 'null',
        bool_literal: _ => choice('true', 'false'),

        // ─── Types ──────────────────────────────────────────────────────────────

        type: $ => seq(
            optional('const'),
            choice(
                $.primitive_type,
                $.scoped_name,
            ),
            optional(seq('<', $.type, repeat(seq(',', $.type)), '>')),
            optional($.array_type_suffix),
            optional('@'),
            optional('&'),
            optional('?'),
        ),

        primitive_type: _ => choice(
            'void',
            'int', 'int8', 'int16', 'int32', 'int64',
            'uint', 'uint8', 'uint16', 'uint32', 'uint64',
            'float', 'double',
            'bool',
            'string',
            'auto',
        ),

        array_type_suffix: _ => seq('[', ']'),

        scoped_name: $ => prec.left(seq(
            optional('::'),
            $.identifier,
            repeat(seq('::', $.identifier)),
        )),

        // ─── Literals ───────────────────────────────────────────────────────────

        integer_literal: _ => token(seq(
            /[0-9]+/,
            optional(/[uU]/),
        )),

        hex_literal: _ => token(seq(
            /0[xX]/,
            /[0-9a-fA-F]+/,
        )),

        bits_literal: _ => token(seq(
            /0[bB]/,
            /[01]+/,
        )),

        float_literal: _ => token(seq(
            choice(
                // 1e5, 1E-3
                seq(/[0-9]+/, /[eE][+-]?[0-9]+/),
                // .3, .3e5
                seq('.', /[0-9]+/, optional(/[eE][+-]?[0-9]+/)),
                // 1.2, 1.2e5
                seq(/[0-9]+/, '.', /[0-9]+/, optional(/[eE][+-]?[0-9]+/)),
                // 4.
                seq(/[0-9]+/, '.'),
            ),
            optional(/[fF]/),
        )),

        string_literal: $ => choice(
            seq('"', repeat(choice($._string_content_double, $.escape_sequence)), '"'),
            seq("'", repeat(choice($._string_content_single, $.escape_sequence)), "'"),
        ),

        _string_content_double: _ => /[^"\\]+/,
        _string_content_single: _ => /[^'\\]+/,

        escape_sequence: _ => token(seq(
            '\\',
            choice(
                /[nrt'"\\0abfv]/,
                /x[0-9a-fA-F]{1,4}/,
                /u[0-9a-fA-F]{4}/,
                /U[0-9a-fA-F]{8}/,
            ),
        )),

        // ─── Identifier ─────────────────────────────────────────────────────────

        identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,

        // ─── Comments ───────────────────────────────────────────────────────────

        comment: _ => token(seq('//', /.*/)),

        block_comment: _ => token(seq(
            '/*',
            /[^*]*\*+([^/*][^*]*\*+)*/,
            '/',
        )),

        // ─── Misc ───────────────────────────────────────────────────────────────

        semicolon: _ => ';',
    },
})
