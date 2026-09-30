use crate::{topics::TOPIC_SOROSCAN, SoroScanCore};
use soroban_sdk::{
    testutils::{Events as _, Ledger as _},
    Bytes, Env, Symbol, TryFromVal,
};

#[test]
fn test_event_emission_with_max_payload_size() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SoroScanCore);

    // Exercise event emission with a 1 KiB byte-vector payload.
    let payload_bytes = [0xabu8; 1024];
    let payload = Bytes::from_slice(&env, &payload_bytes);

    env.as_contract(&contract_id, || {
        env.events().publish(
            (Symbol::new(&env, TOPIC_SOROSCAN),),
            payload.clone(),
        );
    });

    let events = env.events().all();
    let event = events.last().expect("1KB payload event should be emitted");

    assert_eq!(event.1.len(), 1);

    let emitted_payload =
        Bytes::try_from_val(&env, &event.2).expect("event payload should decode as Bytes");

    assert_eq!(emitted_payload.len(), 1024);
    assert_eq!(emitted_payload, payload);
}
