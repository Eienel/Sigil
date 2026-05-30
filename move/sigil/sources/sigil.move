/// Sigil: a verifiable provenance layer.
///
/// A signer (a person via wallet, or an AI agent via API key) submits content.
/// The app stores the content on Walrus and writes an on chain Attestation here
/// that records who signed, the Walrus blob id, the sha256 of the content, a
/// declared provenance type, a timestamp, and an optional label.
///
/// Verification compares a freshly computed sha256 against `sha256_hex` stored
/// on the Attestation. That equality is the source of truth for tamper checks.
module sigil::sigil;

use std::string::String;
use sui::clock::Clock;
use sui::event;

/// Provenance type is a small enum encoded as u8:
///   0 = human made
///   1 = AI generated
///   2 = AI assisted
const PROV_HUMAN: u8 = 0;
const PROV_AI: u8 = 1;
const PROV_ASSISTED: u8 = 2;

/// Raised when provenance_type is outside the known range.
const EInvalidProvenanceType: u64 = 0;

/// An on chain provenance mark. Owned by the signer who created it.
public struct Attestation has key, store {
    id: UID,
    /// The address that signed: a wallet for people, an agent key for agents.
    signer: address,
    /// Walrus blob id where the content is stored.
    walrus_blob_id: String,
    /// Lowercase hex sha256 of the exact content bytes.
    sha256_hex: String,
    /// 0 human made, 1 AI generated, 2 AI assisted.
    provenance_type: u8,
    /// Creation time in milliseconds, taken from the on chain Clock.
    timestamp_ms: u64,
    /// Optional human label. Empty string when none.
    label: String,
}

/// Emitted on every create so indexers and the registry feed can pick it up
/// through Tatum's suix_queryEvents.
public struct AttestationCreated has copy, drop {
    attestation_id: ID,
    signer: address,
    walrus_blob_id: String,
    sha256_hex: String,
    provenance_type: u8,
    timestamp_ms: u64,
    label: String,
}

/// Create an Attestation and transfer it to the signer.
///
/// `clock` is the shared 0x6 Clock object, used for a trusted timestamp.
/// The signer keeping their own attestation is intentional, so the
/// self_transfer lint is allowed here.
#[allow(lint(self_transfer))]
public fun create(
    walrus_blob_id: String,
    sha256_hex: String,
    provenance_type: u8,
    label: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(
        provenance_type == PROV_HUMAN
            || provenance_type == PROV_AI
            || provenance_type == PROV_ASSISTED,
        EInvalidProvenanceType,
    );

    let signer = ctx.sender();
    let timestamp_ms = clock.timestamp_ms();

    let attestation = Attestation {
        id: object::new(ctx),
        signer,
        walrus_blob_id,
        sha256_hex,
        provenance_type,
        timestamp_ms,
        label,
    };

    event::emit(AttestationCreated {
        attestation_id: object::id(&attestation),
        signer,
        walrus_blob_id: attestation.walrus_blob_id,
        sha256_hex: attestation.sha256_hex,
        provenance_type,
        timestamp_ms,
        label: attestation.label,
    });

    transfer::public_transfer(attestation, signer);
}

// --- Read only accessors, used by verification and the certificate view ---

public fun signer_of(a: &Attestation): address { a.signer }

public fun walrus_blob_id(a: &Attestation): String { a.walrus_blob_id }

public fun sha256_hex(a: &Attestation): String { a.sha256_hex }

public fun provenance_type(a: &Attestation): u8 { a.provenance_type }

public fun timestamp_ms(a: &Attestation): u64 { a.timestamp_ms }

public fun label(a: &Attestation): String { a.label }
