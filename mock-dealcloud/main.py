"""
Mock DealCloud API server.

Mirrors the real DealCloud REST API shape so the sync adapter works against
both without code changes:
  POST /api/rest/v1/oauth/token
  POST /api/rest/v4/data/entrydata/rows/query/{entryType}

Switch to the real server by updating DEALCLOUD_BASE_URL + credentials in .env.
"""

import io
import json
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse, Response
from fpdf import FPDF
from pydantic import BaseModel

app = FastAPI(title="Mock DealCloud API", version="1.0.0")

FIXTURES = Path(__file__).parent / "fixtures"

_FAKE_TOKEN = "mock-bearer-token-abc123"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@app.post("/api/rest/v1/oauth/token")
async def get_token(
    grant_type: str = "client_credentials",
    client_id: str = "",
    client_secret: str = "",
    scope: str = "data",
) -> dict:
    return {
        "access_token": _FAKE_TOKEN,
        "token_type": "Bearer",
        "expires_in": 900,
    }


def _require_auth(authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ---------------------------------------------------------------------------
# Rows query  — POST /api/rest/v4/data/entrydata/rows/query/{entryType}
# ---------------------------------------------------------------------------

class RowsQueryBody(BaseModel):
    limit: int = 1000
    skip: int = 0
    wrapIntoArrays: bool = True
    query: str | None = None
    fields: list[str] | None = None


def _ref(entry_list_id: int, entry_id: int, name: str) -> dict:
    """Build a DealCloud reference object."""
    return {"type": 0, "id": entry_id, "name": name, "entryListId": entry_list_id}


def _choice(seq: int, choice_id: int, name: str) -> dict:
    return {"seqNumber": seq, "id": choice_id, "name": name, "entryListId": -6}


# --- InvestorVehicle rows ---
_INVESTOR_VEHICLES = [
    {
        "EntryId": 10001,
        "InvestorVehicleNameText": "State Pension Trust Alpha LP",
        "Investor": _ref(2000, 20001, "State Pension Trust Alpha"),
        "Jurisdiction": _ref(2039, 30001, "Delaware"),
        "LegalStructure": _ref(2014, 40001, "Limited Partnership"),
        "InvestmentStrategyPreference": _ref(2011, 50001, "Credit"),
        "PrimaryContact": _ref(2031, 60001, "Jane Smith"),
        "CreatedDate": "2024-01-15T00:00:00Z",
        "ModifiedDate": "2025-06-01T00:00:00Z",
    },
    {
        "EntryId": 10002,
        "InvestorVehicleNameText": "Nordic Sovereign Wealth Vehicle",
        "Investor": _ref(2000, 20002, "Nordic Sovereign Wealth Fund"),
        "Jurisdiction": _ref(2037, 30002, "Norway"),
        "LegalStructure": _ref(2014, 40002, "Sovereign Wealth Fund"),
        "InvestmentStrategyPreference": _ref(2011, 50002, "Credit"),
        "PrimaryContact": _ref(2031, 60002, "Erik Larsen"),
        "CreatedDate": "2024-02-10T00:00:00Z",
        "ModifiedDate": "2025-06-01T00:00:00Z",
    },
    {
        "EntryId": 10003,
        "InvestorVehicleNameText": "Hartwell Family Office Vehicle",
        "Investor": _ref(2000, 20003, "Hartwell Family Office"),
        "Jurisdiction": _ref(2039, 30001, "Delaware"),
        "LegalStructure": _ref(2014, 40003, "Family Office"),
        "InvestmentStrategyPreference": _ref(2011, 50003, "Direct Lending"),
        "PrimaryContact": _ref(2031, 60003, "Robert Hartwell"),
        "CreatedDate": "2024-03-05T00:00:00Z",
        "ModifiedDate": "2025-06-01T00:00:00Z",
    },
    {
        "EntryId": 10004,
        "InvestorVehicleNameText": "Meridian Endowment Fund Vehicle",
        "Investor": _ref(2000, 20004, "Meridian Endowment Fund"),
        "Jurisdiction": _ref(2039, 30003, "New York"),
        "LegalStructure": _ref(2014, 40004, "Endowment"),
        "InvestmentStrategyPreference": _ref(2011, 50001, "Credit"),
        "PrimaryContact": _ref(2031, 60004, "Alice Chen"),
        "CreatedDate": "2024-04-20T00:00:00Z",
        "ModifiedDate": "2025-06-01T00:00:00Z",
    },
]

# --- LP Commitments rows ---
_ATTACHMENTS = [
    {
        "EntryId": 40001,
        "Title": "State Pension Trust Alpha - Side Letter Agreement",
        "FileName": "state_pension_side_letter.pdf",
        "MimeType": "application/pdf",
        "SizeBytes": 48000,
        "RelatedTo": _ref(2056, 30001, "State Pension Trust Alpha Commitment"),
        "CreatedDate": "2023-06-30T00:00:00Z",
        "ModifiedDate": "2023-06-30T00:00:00Z",
    },
    {
        "EntryId": 40002,
        "Title": "Nordic Sovereign Wealth - LPA Side Letter",
        "FileName": "nordic_swf_side_letter.pdf",
        "MimeType": "application/pdf",
        "SizeBytes": 52000,
        "RelatedTo": _ref(2056, 30002, "Nordic Sovereign Wealth Commitment"),
        "CreatedDate": "2023-06-30T00:00:00Z",
        "ModifiedDate": "2023-06-30T00:00:00Z",
    },
]

_ENTRY_ATTACHMENTS: dict[int, dict] = {a["EntryId"]: a for a in _ATTACHMENTS}

_LP_COMMITMENTS = [
    {
        "EntryId": 30001,
        "InvestorVehicle": _ref(2058, 10001, "State Pension Trust Alpha LP"),
        "AssociatedDocuments": _ref(2040, 40001, "State Pension Trust Alpha - Side Letter Agreement"),
        "Investor": _ref(2000, 20001, "State Pension Trust Alpha"),
        "Fund": _ref(2010, 70001, "Comvest Partners VII"),
        "FundraiseProcess": _ref(2061, 80001, "Fund VII Raise"),
        "CommitmentAmount": 50000000,
        "CommitmentDate": "2023-06-30T00:00:00Z",
        "CreatedDate": "2023-06-30T00:00:00Z",
        "ModifiedDate": "2025-01-01T00:00:00Z",
    },
    {
        "EntryId": 30002,
        "InvestorVehicle": _ref(2058, 10002, "Nordic Sovereign Wealth Vehicle"),
        "AssociatedDocuments": _ref(2040, 40002, "Nordic Sovereign Wealth - LPA Side Letter"),
        "Investor": _ref(2000, 20002, "Nordic Sovereign Wealth Fund"),
        "Fund": _ref(2010, 70001, "Comvest Partners VII"),
        "FundraiseProcess": _ref(2061, 80001, "Fund VII Raise"),
        "CommitmentAmount": 75000000,
        "CommitmentDate": "2023-06-30T00:00:00Z",
        "CreatedDate": "2023-06-30T00:00:00Z",
        "ModifiedDate": "2025-01-01T00:00:00Z",
    },
    {
        "EntryId": 30003,
        "InvestorVehicle": _ref(2058, 10003, "Hartwell Family Office Vehicle"),
        "Investor": _ref(2000, 20003, "Hartwell Family Office"),
        "Fund": _ref(2010, 70001, "Comvest Partners VII"),
        "FundraiseProcess": _ref(2061, 80001, "Fund VII Raise"),
        "CommitmentAmount": 10000000,
        "CommitmentDate": "2023-09-15T00:00:00Z",
        "CreatedDate": "2023-09-15T00:00:00Z",
        "ModifiedDate": "2025-01-01T00:00:00Z",
    },
    {
        "EntryId": 30004,
        "InvestorVehicle": _ref(2058, 10004, "Meridian Endowment Fund Vehicle"),
        "Investor": _ref(2000, 20004, "Meridian Endowment Fund"),
        "Fund": _ref(2010, 70001, "Comvest Partners VII"),
        "FundraiseProcess": _ref(2061, 80001, "Fund VII Raise"),
        "CommitmentAmount": 25000000,
        "CommitmentDate": "2023-09-15T00:00:00Z",
        "CreatedDate": "2023-09-15T00:00:00Z",
        "ModifiedDate": "2025-01-01T00:00:00Z",
    },
]

# Deal Status choice ids (zStatus field id: 2544)
_STATUS_ACTIVE = _choice(1, 1315, "Active")
_STATUS_PASSED = _choice(2, 1317, "Passed/Dead")
_STATUS_CLOSED = _choice(3, 1316, "Closed")

# Deal Stage choice ids (zStage field id: 2545)
def _stage(name: str, seq: int, sid: int) -> dict:
    return _choice(seq, sid, name)

_DEALS = [
    {
        "EntryId": 20001,
        "ProjectName": "Helios Solar Portfolio",
        "Account": _ref(2000, 90001, "Helios Solar LLC"),
        "Sector": _ref(2047, 100001, "Renewable Energy"),
        "SubSector": _ref(2046, 110001, "Solar"),
        "Strategy": _ref(2011, 50003, "Direct Lending"),
        "Status": _STATUS_ACTIVE,
        "Stage": _stage("2 - Pre-IC", 3, 1320),
        "GlobalDealSize": 8000000,
        "LiquidityTrackerExpectedFundingAmount": 8000000,
        "LiquidityTrackerExpectedFundingDate": "2026-07-01T00:00:00Z",
        "NewDealDate": "2026-03-01T00:00:00Z",
        "DealDescription": "Solar asset-backed lending facility.",
        "CreatedDate": "2026-03-01T00:00:00Z",
        "ModifiedDate": "2026-05-01T00:00:00Z",
    },
    {
        "EntryId": 20002,
        "ProjectName": "MedTech Ventures III",
        "Account": _ref(2000, 90002, "MedTech Ventures"),
        "Sector": _ref(2047, 100002, "Healthcare"),
        "SubSector": _ref(2046, 110002, "Medical Devices"),
        "Strategy": _ref(2011, 50003, "Direct Lending"),
        "Status": _STATUS_ACTIVE,
        "Stage": _stage("1 - Deal Received", 2, 1319),
        "GlobalDealSize": 5000000,
        "LiquidityTrackerExpectedFundingAmount": 5000000,
        "LiquidityTrackerExpectedFundingDate": "2026-08-01T00:00:00Z",
        "NewDealDate": "2026-04-01T00:00:00Z",
        "DealDescription": "Senior secured term loan for medical device manufacturer.",
        "CreatedDate": "2026-04-01T00:00:00Z",
        "ModifiedDate": "2026-05-01T00:00:00Z",
    },
    {
        "EntryId": 20003,
        "ProjectName": "Ironclad Industrial",
        "Account": _ref(2000, 90003, "Ironclad Industrial Corp"),
        "Sector": _ref(2047, 100003, "Manufacturing"),
        "SubSector": _ref(2046, 110003, "Industrial"),
        "Strategy": _ref(2011, 50003, "Direct Lending"),
        "Status": _STATUS_ACTIVE,
        "Stage": _stage("0 - Early Look", 1, 1318),
        "GlobalDealSize": 12000000,
        "LiquidityTrackerExpectedFundingAmount": 12000000,
        "LiquidityTrackerExpectedFundingDate": "2026-09-01T00:00:00Z",
        "NewDealDate": "2026-04-15T00:00:00Z",
        "DealDescription": "Asset-based lending for industrial manufacturer.",
        "CreatedDate": "2026-04-15T00:00:00Z",
        "ModifiedDate": "2026-05-01T00:00:00Z",
    },
    {
        "EntryId": 20004,
        "ProjectName": "ClearWater Infrastructure",
        "Account": _ref(2000, 90004, "ClearWater Infra LLC"),
        "Sector": _ref(2047, 100004, "Infrastructure"),
        "SubSector": _ref(2046, 110004, "Water"),
        "Strategy": _ref(2011, 50003, "Direct Lending"),
        "Status": _STATUS_CLOSED,
        "Stage": _stage("Current Investment", 12, 1324),
        "GlobalDealSize": 20000000,
        "LiquidityTrackerExpectedFundingAmount": 20000000,
        "ClosedDealDate": "2025-12-01T00:00:00Z",
        "NewDealDate": "2025-09-01T00:00:00Z",
        "DealDescription": "Infrastructure finance for water utility.",
        "CreatedDate": "2025-09-01T00:00:00Z",
        "ModifiedDate": "2026-01-01T00:00:00Z",
    },
    {
        "EntryId": 20005,
        "ProjectName": "Apex Logistics Platform",
        "Account": _ref(2000, 90005, "Apex Logistics Inc"),
        "Sector": _ref(2047, 100005, "Transportation"),
        "SubSector": _ref(2046, 110005, "Logistics"),
        "Strategy": _ref(2011, 50003, "Direct Lending"),
        "Status": _STATUS_ACTIVE,
        "Stage": _stage("2 - Pre-IC", 3, 1320),
        "GlobalDealSize": 7500000,
        "LiquidityTrackerExpectedFundingAmount": 7500000,
        "LiquidityTrackerExpectedFundingDate": "2026-07-15T00:00:00Z",
        "NewDealDate": "2026-03-20T00:00:00Z",
        "DealDescription": "Recurring revenue facility for logistics SaaS platform.",
        "CreatedDate": "2026-03-20T00:00:00Z",
        "ModifiedDate": "2026-05-01T00:00:00Z",
    },
    {
        "EntryId": 20006,
        "ProjectName": "GreenField Agri Fund",
        "Account": _ref(2000, 90006, "GreenField Agriculture LLC"),
        "Sector": _ref(2047, 100006, "Agriculture"),
        "SubSector": _ref(2046, 110006, "Agribusiness"),
        "Strategy": _ref(2011, 50003, "Direct Lending"),
        "Status": _STATUS_PASSED,
        "Stage": _stage("Passed Deal", 8, 1326),
        "GlobalDealSize": 4000000,
        "PassedDeadDate": "2026-02-01T00:00:00Z",
        "NewDealDate": "2025-11-01T00:00:00Z",
        "DealDescription": "Asset-backed lending for agribusiness operator.",
        "CreatedDate": "2025-11-01T00:00:00Z",
        "ModifiedDate": "2026-02-01T00:00:00Z",
    },
]

_ENTRY_TYPE_MAP: dict[str, list[dict]] = {
    "InvestorVehicle": _INVESTOR_VEHICLES,
    "LPCommitments": _LP_COMMITMENTS,
    "Deal": _DEALS,
    "Attachment": _ATTACHMENTS,
}


def _make_side_letter_pdf(lp_name: str, clauses: list[tuple[str, str]]) -> bytes:
    """Generate a realistic side letter PDF using fpdf2."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 12, "SIDE LETTER AGREEMENT", ln=True, align="C")
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 8, f"Limited Partner: {lp_name}", ln=True, align="C")
    pdf.cell(0, 8, "Comvest Partners VII, L.P.", ln=True, align="C")
    pdf.ln(8)

    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(
        0, 6,
        "This Side Letter Agreement is entered into as of June 30, 2023, between "
        f"{lp_name} (the \"Limited Partner\") and Comvest Partners VII GP, LLC "
        "(the \"General Partner\"). Capitalized terms not defined herein have the "
        "meanings given in the Limited Partnership Agreement.",
    )
    pdf.ln(6)

    for i, (title, body) in enumerate(clauses, 1):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 7, f"Section {i}. {title}", ln=True)
        pdf.set_font("Helvetica", size=10)
        pdf.multi_cell(0, 6, body)
        pdf.ln(4)

    pdf.set_font("Helvetica", "I", 9)
    pdf.cell(0, 6, "IN WITNESS WHEREOF, the parties have executed this Agreement.", ln=True)

    return pdf.output()


@app.post("/api/rest/v4/data/entrydata/rows/query/{entry_type}")
async def query_rows(
    entry_type: str,
    body: RowsQueryBody,
    authorization: str | None = Header(default=None),
) -> JSONResponse:
    _require_auth(authorization)

    rows = _ENTRY_TYPE_MAP.get(entry_type)
    if rows is None:
        raise HTTPException(status_code=404, detail=f"EntryType '{entry_type}' not found")

    total = len(rows)
    page = rows[body.skip: body.skip + body.limit]
    return JSONResponse({"totalRecords": total, "rows": page})


_PDF_FILES: dict[int, str] = {
    40001: "fixtures/pdfs/ilpa_model_lpa_whole_of_fund.pdf",
    40002: "fixtures/pdfs/ilpa_model_lpa_deal_by_deal.pdf",
}

_SIDE_LETTER_CLAUSES: dict[int, tuple[str, list[tuple[str, str]]]] = {
    40001: (
        "State Pension Trust Alpha LP",
        [
            (
                "ESG Restrictions",
                "The Fund shall not make any new investments in companies deriving more than "
                "10% of revenues from the exploration, production, or refining of fossil fuels "
                "(including coal, oil, and natural gas). Any existing investments inconsistent "
                "with this restriction shall be disclosed to the Limited Partner within 30 days.",
            ),
            (
                "Concentration Limits",
                "No single portfolio investment shall represent more than 15% of the Fund's "
                "total capital commitments at the time of investment. Exposure to any single "
                "industry sector shall not exceed 30% of total commitments.",
            ),
            (
                "ERISA Compliance",
                "The General Partner shall take all actions necessary to ensure that the Fund "
                "does not constitute a 'plan asset' vehicle under ERISA. The Limited Partner's "
                "commitment shall not cause the Fund's 'benefit plan investor' percentage to "
                "exceed 25% as defined under 29 C.F.R. Section 2510.3-101.",
            ),
            (
                "MFN Election",
                "If the General Partner grants any other Limited Partner more favorable economic "
                "terms (including management fee discounts or carried interest reductions) than "
                "those provided herein, the Limited Partner shall have the right, within 60 days "
                "of written notice, to elect to receive such more favorable terms.",
            ),
            (
                "Co-Investment Rights",
                "The Limited Partner shall have the right to co-invest alongside the Fund in "
                "any portfolio investment on a pro-rata basis up to its proportionate share of "
                "the Fund's total commitments. The General Partner shall provide at least 10 "
                "business days' notice prior to the closing of any such co-investment opportunity.",
            ),
        ],
    ),
    40002: (
        "Nordic Sovereign Wealth Vehicle",
        [
            (
                "Sanctions and Geographic Restrictions",
                "The Fund shall not invest in any entity organized, domiciled, or operating "
                "primarily in any jurisdiction subject to comprehensive sanctions administered "
                "by OFAC, the EU, or the UN Security Council, including but not limited to "
                "Iran, Russia, North Korea, Syria, and Cuba.",
            ),
            (
                "Gambling and Vice Restrictions",
                "The Fund shall not make any investment in companies that derive more than 5% "
                "of their revenues from gambling operations, adult entertainment, tobacco "
                "manufacturing, or weapons manufacturing for non-governmental customers.",
            ),
            (
                "Sovereign Immunity",
                "Nothing in this Agreement shall constitute a waiver of the Limited Partner's "
                "sovereign immunity rights under applicable law. Any dispute resolution "
                "mechanism shall be subject to the Limited Partner's applicable sovereign "
                "immunity protections.",
            ),
            (
                "Reporting Requirements",
                "The General Partner shall provide quarterly reports to the Limited Partner "
                "within 45 days of each quarter-end, including detailed portfolio valuations, "
                "capital account statements, and ESG metrics for each portfolio company. "
                "Annual audited financial statements shall be delivered within 90 days of year-end.",
            ),
        ],
    ),
}


@app.get("/api/rest/v4/data/files/{attachment_id}")
async def download_attachment(
    attachment_id: int,
    authorization: str | None = Header(default=None),
) -> Response:
    _require_auth(authorization)

    attachment = _ENTRY_ATTACHMENTS.get(attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    filename = attachment.get("FileName", f"document_{attachment_id}.pdf")

    # Serve real PDF if available
    pdf_path = _PDF_FILES.get(attachment_id)
    if pdf_path and Path(pdf_path).exists() and Path(pdf_path).stat().st_size > 10_000:
        pdf_bytes = Path(pdf_path).read_bytes()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # Fallback: generate with fpdf2
    clauses_data = _SIDE_LETTER_CLAUSES.get(attachment_id)
    if not clauses_data:
        raise HTTPException(status_code=404, detail="PDF not available")

    lp_name, clauses = clauses_data
    pdf_bytes = _make_side_letter_pdf(lp_name, clauses)
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "mock-dealcloud"}
