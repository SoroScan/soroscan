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

fn emit_soroscan_event_impl(input: proc_macro2::TokenStream) -> Result<proc_macro2::TokenStream, syn::Error> {
    let parser = Punctuated::<Expr, Token![,]>::parse_terminated;
    let args = parser.parse2(input.clone())?;

    if args.len() != 3 {
        return Err(syn::Error::new_spanned(
            input,
            "Expected: emit_soroscan_event!(env, event_type, payload)",
        ));
    }

    let env_expr = &args[0];
    let event_type = &args[1];
    let payload = &args[2];

    Ok(quote! {
        {
            use soroban_sdk::symbol_short;
            #env_expr.events().publish(
                (symbol_short!("soroscan"), #event_type),
                #payload
            )
        }
    })
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
    emit_soroscan_event_impl(input.into())
        .unwrap_or_else(|err| err.to_compile_error())
        .into()
}

fn emit_soroscan_batch_impl(input: proc_macro2::TokenStream) -> Result<proc_macro2::TokenStream, syn::Error> {
    let parser = Punctuated::<Expr, Token![,]>::parse_terminated;
    let args = parser.parse2(input.clone())?;

    if args.len() != 4 {
        return Err(syn::Error::new_spanned(
            input,
            "Expected: emit_soroscan_batch!(env, indexer, event_count, total_count)",
        ));
    }

    let env_expr = &args[0];
    let indexer = &args[1];
    let event_count = &args[2];
    let total_count = &args[3];

    Ok(quote! {
        {
            use soroban_sdk::symbol_short;
            #env_expr.events().publish(
                (symbol_short!("soroscan"), symbol_short!("batch")),
                (#indexer, #event_count, #total_count)
            )
        }
    })
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
    emit_soroscan_batch_impl(input.into())
        .unwrap_or_else(|err| err.to_compile_error())
        .into()
}

fn soroscan_topics_impl(input: proc_macro2::TokenStream) -> Result<proc_macro2::TokenStream, syn::Error> {
    let parser = Punctuated::<syn::Ident, Token![,]>::parse_terminated;
    let identifiers = parser.parse2(input.clone())?;

    if identifiers.is_empty() {
        return Err(syn::Error::new_spanned(
            input,
            "Expected at least one topic identifier",
        ));
    }

    let symbol_shorts: Vec<proc_macro2::TokenStream> = identifiers
        .iter()
        .map(|id| {
            quote! {
                symbol_short!(#id)
            }
        })
        .collect();

    Ok(quote! {
        {
            use soroban_sdk::{symbol_short, Vec};
            let mut topics = Vec::new(env);
            #(topics.push_back(#symbol_shorts);)*
            topics
        }
    })
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
    soroscan_topics_impl(input.into())
        .unwrap_or_else(|err| err.to_compile_error())
        .into()
}

/// Check if a string is a valid Rust identifier
#[allow(dead_code)]
fn is_valid_identifier(s: &str) -> bool {
    if s.is_empty() {
        return false;
    }

    let first_char = s.chars().next().unwrap();
    if !first_char.is_alphabetic() && first_char != '_' {
        return false;
    }

    s.chars().all(|c| c.is_alphanumeric() || c == '_')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_valid_identifier_valid() {
        assert!(is_valid_identifier("swap"));
        assert!(is_valid_identifier("transfer_v2"));
        assert!(is_valid_identifier("_private"));
        assert!(is_valid_identifier("EVENT_TYPE123"));
    }

    #[test]
    fn test_is_valid_identifier_invalid() {
        assert!(!is_valid_identifier(""));
        assert!(!is_valid_identifier("123invalid"));
        assert!(!is_valid_identifier("invalid-type"));
        assert!(!is_valid_identifier("invalid.type"));
    }

    #[test]
    fn test_emit_soroscan_event_tuple_payload() {
        // Issue #1649: tuple payloads with commas must expand without error
        let input = quote! {
            env,
            symbol_short!("swap"),
            (sender, receiver, amount)
        };
        let result = emit_soroscan_event_impl(input);
        assert!(result.is_ok(), "Failed to parse tuple payload: {:?}", result.err());

        let output = result.unwrap().to_string();
        assert!(output.contains("publish"));
        assert!(output.contains("(sender , receiver , amount)") || output.contains("sender , receiver , amount"));
    }

    #[test]
    fn test_emit_soroscan_event_single_payload() {
        let input = quote! {
            env,
            symbol_short!("mint"),
            amount
        };
        let result = emit_soroscan_event_impl(input);
        assert!(result.is_ok());
        let output = result.unwrap().to_string();
        assert!(output.contains("publish"));
    }

    #[test]
    fn test_emit_soroscan_event_invalid_arg_count() {
        let input = quote! {
            env,
            symbol_short!("mint")
        };
        let result = emit_soroscan_event_impl(input);
        assert!(result.is_err());
    }

    #[test]
    fn test_emit_soroscan_batch_success() {
        let input = quote! {
            env,
            indexer_addr,
            5,
            42
        };
        let result = emit_soroscan_batch_impl(input);
        assert!(result.is_ok());
        let output = result.unwrap().to_string();
        assert!(output.contains("batch"));
    }

    #[test]
    fn test_emit_soroscan_batch_invalid_arg_count() {
        let input = quote! {
            env,
            indexer_addr,
            5
        };
        let result = emit_soroscan_batch_impl(input);
        assert!(result.is_err());
    }

    #[test]
    fn test_soroscan_topics_success() {
        let input = quote! {
            swap, from, to, amount
        };
        let result = soroscan_topics_impl(input);
        assert!(result.is_ok());
        let output = result.unwrap().to_string();
        assert!(output.contains("symbol_short ! (swap)"));
    }
}
