

// Atmosphäre des Gesteinsplaneten: Parameter und Transmissions-Tabelle (Bruneton-Parametrisierung).
// ext: { S, RS, dispatch, makeCtx, P* }  (* = lebender Zustand, per Getter/Setter)
export function createAtmosphaere(ext) {
  const { S, RS, dispatch, makeCtx } = ext;
  function atmoParams() {
    const k = S.thick, Rkm = 6371, on = S.modAtmo ? 1 : 0;
    const scale = Rkm * 1000 / k;
    return {
      HR: 8 / Rkm * k, HM: 1.2 / Rkm * k, Rt: 1 + 60 / Rkm * k,
      bR: [5.802e-6, 13.558e-6, 33.1e-6].map((v) => v * scale * S.atmo * on),
      bM: 3.996e-6 * scale * S.haze * on, bMe: 4.44e-6 * scale * S.haze * on,
      bO: [0.65e-6, 1.881e-6, 0.085e-6].map((v) => v * scale * S.atmo * on),
      oz: [25 / Rkm * k, 15 / Rkm * k],
    };
  }
  function updateTrans(enc) {
    if (!S.modAtmo || !ext.P.trans) return;   // Luft aus: keine Tabelle nötig (Aus-Variante liest sie nicht)
    const key = `${S.thick}|${S.atmo}|${S.haze}|${S.modAtmo}`;
    if (key === RS.transKey) return;
    RS.transKey = key;
    const A = atmoParams();
    const p = new Float32Array(32);
    p.set([1, A.Rt, A.HR, A.HM, ...A.bR, A.bMe, ...A.bO, 0, A.oz[0], A.oz[1], 0, 0]);
    dispatch(makeCtx(enc), ext.P.trans, RS.bgTrans, p, 32, 8);
  }
  return { atmoParams, updateTrans };
}
