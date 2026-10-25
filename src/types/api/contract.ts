export type ContractOut = {
    id: string;
    booking_id: string;
    title: string | null;
    body: string | null;
    body_sha256?: string | null;
    signed_body_sha256?: string | null;
    context: Record<string, string> | null;
    /** Legacy: PDF en disco. Preferir snapshot + GET /contracts/booking/:id/pdf */
    contract_pdf_url: string | null;
    contract_signed_pdf_url: string | null;
    contractor_signature_url: string | null;
    musician_signature_url: string | null;
    contractor_signed: boolean;
    musician_signed: boolean;
    terms_accepted: boolean;
    terms_accepted_at: string | null;
    contractor_sign_timestamp: string | null;
    musician_sign_timestamp: string | null;
    created_at: string;
    updated_at: string;
};
