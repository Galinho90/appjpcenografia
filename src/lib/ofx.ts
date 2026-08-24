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
  ledgerBal?: number;
  ledgerBalDate?: string;
  dtStart?: string;
  dtEnd?: string;
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

  // Saldo do extrato (LEDGERBAL) e período (DTSTART/DTEND)
  const ledgerBlockMatch = body.match(/<LEDGERBAL>([\s\S]*?)<\/LEDGERBAL>/i);
  let ledgerBal: number | undefined;
  let ledgerBalDate: string | undefined;
  if (ledgerBlockMatch) {
    const lb = ledgerBlockMatch[1];
    const amt = getTag(lb, "BALAMT");
    const dt = getTag(lb, "DTASOF");
    if (amt != null) {
      const n = Number(amt.replace(",", "."));
      if (isFinite(n)) ledgerBal = n;
    }
    if (dt) ledgerBalDate = parseDate(dt);
  }

  const dtStart = getTag(body, "DTSTART");
  const dtEnd = getTag(body, "DTEND");

  return {
    bankId,
    acctId,
    transactions,
    ledgerBal,
    ledgerBalDate,
    dtStart: dtStart ? parseDate(dtStart) : undefined,
    dtEnd: dtEnd ? parseDate(dtEnd) : undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// Deduplicação de importação OFX
// ─────────────────────────────────────────────────────────────

/**
 * Situação de uma transação do arquivo em relação ao que já existe no sistema.
 * - `nova`: pode ser importada.
 * - `ja_importada`: o FITID já existe na conta selecionada.
 * - `duplicada_arquivo`: o mesmo FITID aparece mais de uma vez no arquivo.
 * - `sem_fitid`: o arquivo não trouxe identificador único (não é deduplicável).
 */
export type OFXDedupStatus = "nova" | "ja_importada" | "duplicada_arquivo" | "sem_fitid";

export type OFXDedupItem = {
  tx: OFXTransaction;
  status: OFXDedupStatus;
};

export type OFXDedupResult = {
  items: OFXDedupItem[];
  totais: {
    total: number;
    novas: number;
    jaImportadas: number;
    duplicadasNoArquivo: number;
    semFitid: number;
  };
};

/**
 * Classifica as transações de um OFX usando o FITID como identificador único.
 * Função pura (testável): não acessa banco nem estado de UI.
 *
 * @param transactions transações extraídas do arquivo (ordem preservada)
 * @param fitidsExistentes FITIDs já presentes na conta de destino
 */
export function classifyOFXTransactions(
  transactions: readonly OFXTransaction[],
  fitidsExistentes: ReadonlySet<string>
): OFXDedupResult {
  const vistos = new Set<string>();
  const items: OFXDedupItem[] = [];
  const totais = { total: 0, novas: 0, jaImportadas: 0, duplicadasNoArquivo: 0, semFitid: 0 };

  for (const tx of transactions) {
    const fitid = (tx.fitid ?? "").trim();
    let status: OFXDedupStatus;

    if (!fitid) {
      status = "sem_fitid";
      totais.semFitid++;
    } else if (fitidsExistentes.has(fitid)) {
      status = "ja_importada";
      totais.jaImportadas++;
    } else if (vistos.has(fitid)) {
      status = "duplicada_arquivo";
      totais.duplicadasNoArquivo++;
    } else {
      status = "nova";
      totais.novas++;
      vistos.add(fitid);
    }

    totais.total++;
    items.push({ tx, status });
  }

  return { items, totais };
}

/** Divide uma lista em blocos de tamanho fixo (usado para consultar FITIDs sem estourar a URL). */
export function chunk<T>(list: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error("size deve ser > 0");
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
