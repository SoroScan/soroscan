/*!
 * Procedural macros for standardized SoroScan event emission.
 *
 * This crate provides the `emit_soroscan_event!` macro which simplifies
 * standardized event topic and data formatting for SoroScan-indexed events.
 */

extern crate proc_macro;

use proc_macro::TokenStream;
use quote::quote;
use syn::parse::Parser;
use syn::punctuated::Punctuated;
use syn::{Expr, Token};

/// Parse a comma-separated list of expressions from a function-like macro's
/// input stream.
///
/// The previous implementation turned the input into a string and split on
/// `','`, which corrupts any argument that itself contains a comma — most
/// importantly a tuple payload like `(sender, receiver, amount)`, which was
/// split into three phantom arguments. Parsing with `syn` keeps each argument
/// structurally intact, so nested commas inside parentheses, brackets, and
/// braces stay part of the argument they belong to.
fn parse_args(input: proc_macro2::TokenStream, expected: usize) -> Result<Vec<Expr>, syn::Error> {
    let parser = Punctuated::<Expr, Token![,]>::parse_terminated;
    let args = parser.parse2(input).map_err(|err| {
        syn::Error::new(
            err.span(),
            format!("Expected exactly {expected} comma-separated arguments"),
        )
    })?;

    if args.len() != expected {
        return Err(syn::Error::new(
            proc_macro2::Span::call_site(),
            format!("Expected {expected} arguments, got {}", args.len()),
        ));
    }

    Ok(args.into_iter().collect())
}

/// Emit a standardized SoroScan event with topics and payload.
///
/// This macro simplifies event emission by:
/// - Automatically formatting topics as (symbol_short!("soroscan"), event_type)
/// - Ensuring consistent XDR encoding of topics and data
/// - Reducing boilerplate for event emission
///
/// # Syntax
/// ```ignore
/// emit_soroscan_event!(env, event_type_symbol, payload_data)
/// ```
///
/// # Example
/// ```ignore
/// emit_soroscan_event!(env, symbol_short!("swap"), (
///     sender,
///     receiver,
///     amount
/// ));
/// ```
///
/// # Expands to
/// ```ignore
/// env.events().publish(
///     (symbol_short!("soroscan"), symbol_short!("swap")),
///     (sender, receiver, amount)
/// )
/// ```
#[proc_macro]
#[allow(clippy::needless_pass_by_value)]
pub fn emit_soroscan_event(input: TokenStream) -> TokenStream {
    let args = match parse_args(input.into(), 3) {
        Ok(args) => args,
        Err(err) => {
            return syn::Error::new(
                err.span(),
                "Expected: emit_soroscan_event!(env, event_type, payload)",
            )
            .to_compile_error()
            .into();
        }
    };

    let env_expr = &args[0];
    let event_type = &args[1];
    let payload = &args[2];

    let expanded = quote! {
        {
            use soroban_sdk::symbol_short;
            (#env_expr).events().publish(
                (symbol_short!("soroscan"), #event_type),
                #payload
            )
        }
    };

    TokenStream::from(expanded)
}

/// Emit a batch of SoroScan events with summary.
///
/// This macro simplifies batch event emission by:
/// - Automatically formatting batch topic as (symbol_short!("soroscan"), symbol_short!("batch"))
/// - Encoding batch metadata consistently
/// - Reducing boilerplate for batch operations
///
/// # Syntax
/// ```ignore
/// emit_soroscan_batch!(env, indexer, event_count, total_count)
/// ```
///
/// # Example
/// ```ignore
/// emit_soroscan_batch!(env, indexer_addr, 5, 42)
/// ```
///
/// # Expands to
/// ```ignore
/// env.events().publish(
///     (symbol_short!("soroscan"), symbol_short!("batch")),
///     (indexer_addr, 5, 42)
/// )
/// ```
#[proc_macro]
#[allow(clippy::needless_pass_by_value)]
pub fn emit_soroscan_batch(input: TokenStream) -> TokenStream {
    let args = match parse_args(input.into(), 4) {
        Ok(args) => args,
        Err(err) => {
            return syn::Error::new(
                err.span(),
                "Expected: emit_soroscan_batch!(env, indexer, event_count, total_count)",
            )
            .to_compile_error()
            .into();
        }
    };

    let env_expr = &args[0];
    let indexer = &args[1];
    let event_count = &args[2];
    let total_count = &args[3];

    let expanded = quote! {
        {
            use soroban_sdk::symbol_short;
            (#env_expr).events().publish(
                (symbol_short!("soroscan"), symbol_short!("batch")),
                (#indexer, #event_count, #total_count)
            )
        }
    };

    TokenStream::from(expanded)
}

/// Format an event topic vector with consistent naming.
///
/// This macro ensures standardized topic field naming by:
/// - Validating topic identifiers are valid symbols
/// - Converting to symbol_short! automatically
/// - Maintaining consistent formatting across events
///
/// # Syntax
/// ```ignore
/// soroscan_topics![event_name, field1, field2, ...]
/// ```
///
/// # Example
/// ```ignore
/// soroscan_topics![swap, from, to, amount]
/// ```
///
/// # Expands to topics vector
#[proc_macro]
#[allow(clippy::needless_pass_by_value)]
pub fn soroscan_topics(input: TokenStream) -> TokenStream {
    let parser = Punctuated::<Expr, Token![,]>::parse_terminated;
    let parsed = match parser.parse2(input.into()) {
        Ok(punct) => punct,
        Err(err) => {
            return syn::Error::new(err.span(), "Expected at least one topic identifier")
                .to_compile_error()
                .into();
        }
    };

    if parsed.is_empty() {
        return syn::Error::new(
            proc_macro2::Span::call_site(),
            "Expected at least one topic identifier",
        )
        .to_compile_error()
        .into();
    }

    // Every element must be a plain identifier so it can become symbol_short!(ident).
    let mut identifiers: Vec<syn::Ident> = Vec::with_capacity(parsed.len());
    for expr in &parsed {
        match expr {
            Expr::Path(path) if path.qself.is_none() && path.path.get_ident().is_some() => {
                identifiers.push(path.path.get_ident().unwrap().clone());
            }
            other => {
                return syn::Error::new_spanned(
                    other,
                    "Invalid identifier: topic names must be plain identifiers",
                )
                .to_compile_error()
                .into();
            }
        }
    }

    let expanded = quote! {
        {
            use soroban_sdk::{symbol_short, Vec};
            let mut topics = Vec::new(env);
            #(topics.push_back(symbol_short!(#identifiers));)*
            topics
        }
    };

    TokenStream::from(expanded)
}

#[cfg(test)]
mod tests {
    use super::*;
    use quote::quote;

    #[test]
    fn parses_three_plain_args() {
        let args = parse_args(quote!(env, symbol_short!("swap"), payload), 3).unwrap();
        assert_eq!(args.len(), 3);
    }

    #[test]
    fn keeps_tuple_payload_intact() {
        // A tuple payload contains commas; naive string-splitting would have
        // seen 5 args and failed. syn keeps it as one expression.
        let args = parse_args(quote!(env, symbol_short!("swap"), (a, b, c)), 3).unwrap();
        assert_eq!(args.len(), 3);
        assert!(matches!(args[2], Expr::Tuple(_)));
    }

    #[test]
    fn rejects_wrong_argument_count() {
        assert!(parse_args(quote!(env, payload), 3).is_err());
        assert!(parse_args(quote!(env, a, b, c), 3).is_err());
    }

    #[test]
    fn rejects_empty_input() {
        assert!(parse_args(quote!(), 3).is_err());
    }

    #[test]
    fn parses_four_args_for_batch() {
        let args = parse_args(quote!(env, indexer, 5, 42), 4).unwrap();
        assert_eq!(args.len(), 4);
    }
}
