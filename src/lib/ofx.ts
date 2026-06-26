// Parser OFX minimalista. Suporta OFX 1.x (SGML) e 2.x (XML).

export type OFXTransaction = {
  fitid: string;
  data: string; // ISO yyyy-mm-dd
  valor: number; // sempre positivo
  tipo: "entrada" | "saida";
  descricao: string;
  trntype: string;
};

export type OFXParseResult = {
  bankId?: string;
  acctId?: string;
  transactions: OFXTransaction[];
};

function parseDate(raw: string): string {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return raw;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function getTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : undefined;
}

export function parseOFX(text: string): OFXParseResult {
  const idx = text.indexOf("<");
  const body = idx >= 0 ? text.slice(idx) : text;

  const bankId = getTag(body, "BANKID");
  const acctId = getTag(body, "ACCTID");

  const transactions: OFXTransaction[] = [];
  const re = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const block = m[1] ?? "";
    const fitid = getTag(block, "FITID");
    const dtposted = getTag(block, "DTPOSTED");
    const trnamtStr = getTag(block, "TRNAMT");
    const trntype = getTag(block, "TRNTYPE") ?? "";
    const memo = getTag(block, "MEMO") ?? getTag(block, "NAME") ?? "";
    if (!fitid || !dtposted || !trnamtStr) continue;
    const valor = Number(trnamtStr.replace(",", "."));
    if (!isFinite(valor)) continue;
    transactions.push({
      fitid,
      data: parseDate(dtposted),
      valor: Math.abs(valor),
      tipo: valor >= 0 ? "entrada" : "saida",
      descricao: memo,
      trntype,
    });
  }

  return { bankId, acctId, transactions };
}
