import { describe, it, expect } from "vitest";
import { parseOFX, classifyOFXTransactions, chunk, podeSalvarLinha, type OFXTransaction } from "@/lib/ofx";

const OFX_SGML = `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM><BANKID>077<ACCTID>12345-6</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260701
<DTEND>20260731
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260705120000
<TRNAMT>-150.75
<FITID>ABC123
<MEMO>PAGAMENTO DIARISTA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260710
<TRNAMT>2000.00
<FITID>DEF456
<MEMO>RECEBIMENTO CLIENTE
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>1849.25<DTASOF>20260731</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

const OFX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <BANKTRANLIST>
    <STMTTRN>
      <TRNTYPE>DEBIT</TRNTYPE>
      <DTPOSTED>20260801000000[-3:BRT]</DTPOSTED>
      <TRNAMT>-99.90</TRNAMT>
      <FITID>XYZ789</FITID>
      <NAME>TARIFA BANCARIA</NAME>
    </STMTTRN>
  </BANKTRANLIST>
</OFX>`;

const tx = (fitid: string, over: Partial<OFXTransaction> = {}): OFXTransaction => ({
  fitid,
  data: "2026-07-05",
  valor: 100,
  tipo: "saida",
  descricao: "teste",
  trntype: "DEBIT",
  ...over,
});

describe("parseOFX", () => {
  it("extrai transações, FITID, saldo e período de um OFX 1.x (SGML)", () => {
    const r = parseOFX(OFX_SGML);
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0]).toMatchObject({
      fitid: "ABC123",
      data: "2026-07-05",
      valor: 150.75,
      tipo: "saida",
      descricao: "PAGAMENTO DIARISTA",
    });
    expect(r.transactions[1]).toMatchObject({ fitid: "DEF456", valor: 2000, tipo: "entrada" });
    expect(r.ledgerBal).toBe(1849.25);
    expect(r.ledgerBalDate).toBe("2026-07-31");
    expect(r.dtStart).toBe("2026-07-01");
    expect(r.dtEnd).toBe("2026-07-31");
    expect(r.acctId).toBe("12345-6");
  });

  it("extrai transações de um OFX 2.x (XML) usando NAME como descrição", () => {
    const r = parseOFX(OFX_XML);
    expect(r.transactions).toHaveLength(1);
    expect(r.transactions[0]).toMatchObject({
      fitid: "XYZ789",
      data: "2026-08-01",
      valor: 99.9,
      tipo: "saida",
      descricao: "TARIFA BANCARIA",
    });
  });

  it("ignora transações sem FITID, data ou valor", () => {
    const semFitid = `<OFX><STMTTRN><DTPOSTED>20260101<TRNAMT>-10.00<MEMO>X</STMTTRN></OFX>`;
    expect(parseOFX(semFitid).transactions).toHaveLength(0);
  });
});

describe("classifyOFXTransactions", () => {
  it("marca transações novas quando nenhum FITID existe no sistema", () => {
    const r = classifyOFXTransactions([tx("A"), tx("B")], new Set());
    expect(r.items.map((i) => i.status)).toEqual(["nova", "nova"]);
    expect(r.totais).toMatchObject({ total: 2, novas: 2, jaImportadas: 0, duplicadasNoArquivo: 0 });
  });

  it("marca como já importada quando o FITID existe na conta", () => {
    const r = classifyOFXTransactions([tx("A"), tx("B")], new Set(["A"]));
    expect(r.items.map((i) => i.status)).toEqual(["ja_importada", "nova"]);
    expect(r.totais.jaImportadas).toBe(1);
    expect(r.totais.novas).toBe(1);
  });

  it("mantém apenas a primeira ocorrência de um FITID repetido no arquivo", () => {
    const r = classifyOFXTransactions([tx("A"), tx("A"), tx("A")], new Set());
    expect(r.items.map((i) => i.status)).toEqual(["nova", "duplicada_arquivo", "duplicada_arquivo"]);
    expect(r.totais).toMatchObject({ novas: 1, duplicadasNoArquivo: 2 });
  });

  it("sinaliza transações sem identificador único", () => {
    const r = classifyOFXTransactions([tx(""), tx("  ")], new Set());
    expect(r.items.map((i) => i.status)).toEqual(["sem_fitid", "sem_fitid"]);
    expect(r.totais.semFitid).toBe(2);
  });
});

describe("chunk", () => {
  it("divide a lista em blocos do tamanho informado", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 10)).toEqual([]);
  });

  it("rejeita tamanho inválido", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});

describe("podeSalvarLinha", () => {
  it("exige categoria ao criar quando a opção está desmarcada", () => {
    expect(podeSalvarLinha({ action: "criar", ignorarCategorias: false })).toBe(false);
    expect(podeSalvarLinha({ action: "criar", categoriaId: "c1", ignorarCategorias: false })).toBe(true);
  });
  it("permite criar sem categoria quando a opção está marcada", () => {
    expect(podeSalvarLinha({ action: "criar", ignorarCategorias: true })).toBe(true);
  });
  it("não afeta vincular/ignorar", () => {
    expect(podeSalvarLinha({ action: "vincular", ignorarCategorias: false })).toBe(true);
    expect(podeSalvarLinha({ action: "ignorar", ignorarCategorias: false })).toBe(true);
  });
});
