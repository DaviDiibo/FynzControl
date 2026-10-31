import {
  getBankIdentity,
  getDeterministicColor,
  normalizeBankName,
  CYBERPUNK_PALETTE,
} from '../utils/bank-identity';

describe('Motor de Identidad Bancaria (bank-identity)', () => {
  describe('Normalización de nombres', () => {
    it('elimina espacios en los extremos y convierte a minúsculas', () => {
      expect(normalizeBankName('  Santander  ')).toBe('santander');
      expect(normalizeBankName('BBVA')).toBe('bbva');
    });

    it('elimina tildes y diacríticos correctamente', () => {
      expect(normalizeBankName('Itaú')).toBe('itau');
      expect(normalizeBankName('Crédito')).toBe('credito');
    });

    it('retorna cadena vacía para undefined, null o vacío', () => {
      expect(normalizeBankName(undefined)).toBe('');
      expect(normalizeBankName('')).toBe('');
      expect(normalizeBankName('   ')).toBe('');
    });
  });

  describe('Mapeo de marcas reconocidas', () => {
    it('identifica Santander con color rojo y business-outline', () => {
      const res = getBankIdentity('Santander');
      expect(res.color).toBe('#EC0000');
      expect(res.icon).toBe('business-outline');
      expect(res.shortLabel).toBe('SAN');
    });

    it('identifica BBVA con azul institucional y business-outline', () => {
      const res = getBankIdentity('BBVA');
      expect(res.color).toBe('#004481');
      expect(res.icon).toBe('business-outline');
      expect(res.shortLabel).toBe('BBVA');
    });

    it('identifica Nubank y Nu con morado y card-outline', () => {
      const resNu = getBankIdentity('Nu');
      expect(resNu.color).toBe('#820AD1');
      expect(resNu.icon).toBe('card-outline');
      expect(resNu.shortLabel).toBe('NU');

      const resNubank = getBankIdentity('Nubank Brasil');
      expect(resNubank.color).toBe('#820AD1');
      expect(resNubank.icon).toBe('card-outline');
      expect(resNubank.shortLabel).toBe('NU');
    });

    it('identifica Mercado Pago y MP con celeste y wallet-outline', () => {
      const resMP = getBankIdentity('MP');
      expect(resMP.color).toBe('#009EE3');
      expect(resMP.icon).toBe('wallet-outline');
      expect(resMP.shortLabel).toBe('MP');

      const resMercadoPago = getBankIdentity('Mercado Pago');
      expect(resMercadoPago.color).toBe('#009EE3');
      expect(resMercadoPago.icon).toBe('wallet-outline');
      expect(resMercadoPago.shortLabel).toBe('MP');
    });

    it('identifica Brubank con violeta y phone-portrait-outline', () => {
      const res = getBankIdentity('Brubank');
      expect(res.color).toBe('#6B38FB');
      expect(res.icon).toBe('phone-portrait-outline');
      expect(res.shortLabel).toBe('BRU');
    });

    it('identifica Galicia con naranja y business-outline', () => {
      const res = getBankIdentity('Banco Galicia');
      expect(res.color).toBe('#E84E10');
      expect(res.icon).toBe('business-outline');
      expect(res.shortLabel).toBe('GAL');
    });

    it('identifica Itaú (incluso con tildes) con naranja y business-outline', () => {
      const resWithAccent = getBankIdentity('Banco Itaú');
      expect(resWithAccent.color).toBe('#EC7000');
      expect(resWithAccent.icon).toBe('business-outline');
      expect(resWithAccent.shortLabel).toBe('ITAU');

      const resWithoutAccent = getBankIdentity('itau');
      expect(resWithoutAccent.color).toBe('#EC7000');
      expect(resWithoutAccent.icon).toBe('business-outline');
      expect(resWithoutAccent.shortLabel).toBe('ITAU');
    });

    it('identifica Bancolombia con amarillo y business-outline', () => {
      const res = getBankIdentity('Bancolombia');
      expect(res.color).toBe('#FDDA24');
      expect(res.icon).toBe('business-outline');
      expect(res.shortLabel).toBe('BCOL');
    });

    it('identifica BCP con azul marino y business-outline', () => {
      const resBCP = getBankIdentity('BCP');
      expect(resBCP.color).toBe('#002A8F');
      expect(resBCP.icon).toBe('business-outline');
      expect(resBCP.shortLabel).toBe('BCP');

      const resBancoCredito = getBankIdentity('Banco de Credito');
      expect(resBancoCredito.color).toBe('#002A8F');
      expect(resBancoCredito.icon).toBe('business-outline');
      expect(resBancoCredito.shortLabel).toBe('BCP');
    });

    it('identifica Interbank con verde y business-outline', () => {
      const res = getBankIdentity('Interbank');
      expect(res.color).toBe('#009B3A');
      expect(res.icon).toBe('business-outline');
      expect(res.shortLabel).toBe('IBK');
    });

    it('identifica Next con verde lima y flash-outline', () => {
      const res = getBankIdentity('Next');
      expect(res.color).toBe('#00FF5F');
      expect(res.icon).toBe('flash-outline');
      expect(res.shortLabel).toBe('NEXT');

      const resBancoNext = getBankIdentity('Banco Next');
      expect(resBancoNext.color).toBe('#00FF5F');
      expect(resBancoNext.icon).toBe('flash-outline');
      expect(resBancoNext.shortLabel).toBe('NEXT');
    });

    it('identifica BTG Pactual y BTG con azul corporativo y business-outline', () => {
      const resBTG = getBankIdentity('BTG');
      expect(resBTG.color).toBe('#0A84FF');
      expect(resBTG.icon).toBe('business-outline');
      expect(resBTG.shortLabel).toBe('BTG');

      const resPactual = getBankIdentity('BTG Pactual');
      expect(resPactual.color).toBe('#0A84FF');
      expect(resPactual.icon).toBe('business-outline');
      expect(resPactual.shortLabel).toBe('BTG');
    });

    it('identifica Inter y Banco Inter con naranja y card-outline (sin confundir Interbank)', () => {
      const resInter = getBankIdentity('Inter');
      expect(resInter.color).toBe('#FF7A00');
      expect(resInter.icon).toBe('card-outline');
      expect(resInter.shortLabel).toBe('INTR');

      const resBancoInter = getBankIdentity('Banco Inter');
      expect(resBancoInter.color).toBe('#FF7A00');
      expect(resBancoInter.icon).toBe('card-outline');
      expect(resBancoInter.shortLabel).toBe('INTR');

      // Verificar que Interbank sigue resolviendo a IBK
      const resInterbank = getBankIdentity('Interbank');
      expect(resInterbank.color).toBe('#009B3A');
      expect(resInterbank.icon).toBe('business-outline');
      expect(resInterbank.shortLabel).toBe('IBK');
    });

    it('identifica C6 Bank y C6 con naranja y card-outline', () => {
      const resC6 = getBankIdentity('C6');
      expect(resC6.color).toBe('#FF5900');
      expect(resC6.icon).toBe('card-outline');
      expect(resC6.shortLabel).toBe('C6');

      const resC6Bank = getBankIdentity('C6 Bank');
      expect(resC6Bank.color).toBe('#FF5900');
      expect(resC6Bank.icon).toBe('card-outline');
      expect(resC6Bank.shortLabel).toBe('C6');
    });

    it('identifica Bradesco con rojo oscuro y business-outline', () => {
      const res = getBankIdentity('Banco Bradesco');
      expect(res.color).toBe('#CC092F');
      expect(res.icon).toBe('business-outline');
      expect(res.shortLabel).toBe('BRAD');
    });

    it('identifica Caixa con azul y business-outline', () => {
      const res = getBankIdentity('Caixa Econômica');
      expect(res.color).toBe('#005CA9');
      expect(res.icon).toBe('business-outline');
      expect(res.shortLabel).toBe('CXA');
    });

    it('identifica Banco do Brasil y BB con amarillo y business-outline', () => {
      const resBB = getBankIdentity('BB');
      expect(resBB.color).toBe('#FDDA24');
      expect(resBB.icon).toBe('business-outline');
      expect(resBB.shortLabel).toBe('BB');

      const resBDB = getBankIdentity('Banco do Brasil');
      expect(resBDB.color).toBe('#FDDA24');
      expect(resBDB.icon).toBe('business-outline');
      expect(resBDB.shortLabel).toBe('BB');
    });

    it('identifica Wise con verde lima suave y card-outline', () => {
      const res = getBankIdentity('Wise');
      expect(res.color).toBe('#9FE870');
      expect(res.icon).toBe('card-outline');
      expect(res.shortLabel).toBe('WISE');
    });

    it('identifica PayPal con azul y wallet-outline', () => {
      const res = getBankIdentity('PayPal');
      expect(res.color).toBe('#0079C1');
      expect(res.icon).toBe('wallet-outline');
      expect(res.shortLabel).toBe('PP');
    });

    it('identifica Lemon Cash y Lemon con verde lima neón y card-outline', () => {
      const res = getBankIdentity('Lemon Cash');
      expect(res.color).toBe('#00FF5F');
      expect(res.icon).toBe('card-outline');
      expect(res.shortLabel).toBe('LEMN');
    });

    it('identifica Ualá con rojo coral y card-outline', () => {
      const res = getBankIdentity('Ualá');
      expect(res.color).toBe('#FF334B');
      expect(res.icon).toBe('card-outline');
      expect(res.shortLabel).toBe('UALA');

      const resSinTilde = getBankIdentity('Uala');
      expect(resSinTilde.color).toBe('#FF334B');
      expect(resSinTilde.icon).toBe('card-outline');
      expect(resSinTilde.shortLabel).toBe('UALA');
    });

    it('identifica Revolut y N26 con neón y card-outline', () => {
      const resRev = getBankIdentity('Revolut');
      expect(resRev.color).toBe('#00FFA3');
      expect(resRev.icon).toBe('card-outline');
      expect(resRev.shortLabel).toBe('REV');

      const resN26 = getBankIdentity('N26');
      expect(resN26.color).toBe('#00FFA3');
      expect(resN26.icon).toBe('card-outline');
      expect(resN26.shortLabel).toBe('N26');
    });

    it('identifica Binance y Crypto con dorado y cube-outline', () => {
      const resBinance = getBankIdentity('Binance');
      expect(resBinance.color).toBe('#F3BA2F');
      expect(resBinance.icon).toBe('cube-outline');
      expect(resBinance.shortLabel).toBe('BNB');

      const resCrypto = getBankIdentity('Crypto Wallet');
      expect(resCrypto.color).toBe('#F3BA2F');
      expect(resCrypto.icon).toBe('cube-outline');
      expect(resCrypto.shortLabel).toBe('CRYPTO');

      const resUSDT = getBankIdentity('USDT Ledger');
      expect(resUSDT.color).toBe('#F3BA2F');
      expect(resUSDT.icon).toBe('cube-outline');
      expect(resUSDT.shortLabel).toBe('USDT');
    });

    it('identifica Efectivo y Cash con verde neón y cash-outline', () => {
      const resEfectivo = getBankIdentity('Efectivo');
      expect(resEfectivo.color).toBe('#00FFA3');
      expect(resEfectivo.icon).toBe('cash-outline');
      expect(resEfectivo.shortLabel).toBe('CASH');

      const resCash = getBankIdentity('Cash');
      expect(resCash.color).toBe('#00FFA3');
      expect(resCash.icon).toBe('cash-outline');
      expect(resCash.shortLabel).toBe('CASH');
    });
  });

  describe('Normalización e insensibilidad a mayúsculas/espacios', () => {
    it('normaliza mayúsculas, espacios y caracteres especiales en marcas conocidas', () => {
      const res = getBankIdentity('   SANTANDER RIO  ');
      expect(res.color).toBe('#EC0000');
      expect(res.icon).toBe('business-outline');
      expect(res.shortLabel).toBe('SAN');
    });
  });

  describe('Generación determinista para bancos desconocidos', () => {
    it('mismo nombre siempre produce el mismo color', () => {
      const res1 = getBankIdentity('Chase Bank');
      const res2 = getBankIdentity('Chase Bank');
      const res3 = getBankIdentity('chase bank');

      expect(res1.color).toBe(res2.color);
      expect(res1.color).toBe(res3.color);
      expect(res1.icon).toBe('business-outline');
      expect(CYBERPUNK_PALETTE).toContain(res1.color);
    });

    it('nombres distintos pueden tener colores deterministas de la paleta cyberpunk', () => {
      const resWells = getBankIdentity('Wells Fargo');
      const resPNC = getBankIdentity('PNC');

      expect(CYBERPUNK_PALETTE).toContain(resWells.color);
      expect(CYBERPUNK_PALETTE).toContain(resPNC.color);
      expect(resWells.icon).toBe('business-outline');
      expect(resPNC.icon).toBe('business-outline');
    });

    it('getDeterministicColor calcula un color de la paleta para cualquier texto', () => {
      const color = getDeterministicColor('Banco Desconocido XYZ');
      expect(CYBERPUNK_PALETTE).toContain(color);
    });
  });

  describe('Manejo seguro de valores undefined, vacíos o nulos', () => {
    it('maneja undefined sin lanzar errores y con valores por defecto seguros', () => {
      const res = getBankIdentity(undefined);
      expect(res).toBeDefined();
      expect(res.color).toBe(CYBERPUNK_PALETTE[0]);
      expect(res.icon).toBe('business-outline');
      expect(res.shortLabel).toBe('BNK');
    });

    it('maneja strings vacíos o con solo espacios sin errores', () => {
      const resEmpty = getBankIdentity('');
      expect(resEmpty.color).toBe(CYBERPUNK_PALETTE[0]);
      expect(resEmpty.icon).toBe('business-outline');
      expect(resEmpty.shortLabel).toBe('BNK');

      const resSpaces = getBankIdentity('     ');
      expect(resSpaces.color).toBe(CYBERPUNK_PALETTE[0]);
      expect(resSpaces.icon).toBe('business-outline');
      expect(resSpaces.shortLabel).toBe('BNK');
    });
  });
});
