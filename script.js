// ==========================================================================
// 1. NETEJAR I SEPARAR EL TEXT DEL CSV (AMB SUPORT PER A COMENTARIS)
// ==========================================================================
function parsejarCSV(text) {
    const textNet = text.replace(/\r/g, "").replace(/^\uFEFF/, "").trim();
    const linies = textNet.split("\n");
    const partits = [];
    
    if (linies.length <= 1) return [];

    const primeraLinia = linies[0].toLowerCase();
    const separador = primeraLinia.includes(";") ? ";" : ",";

    for (let i = 1; i < linies.length; i++) {
        const linia = linies[i].trim();
        if (!linia) continue; 

        if (linia.startsWith("#") || linia.startsWith("//")) continue; 

        const columnes = linia.split(separador); 
        
        const grup = columnes[0]?.trim() || "";
        const equip1 = columnes[1]?.trim() || "";
        const gols1Raw = columnes[2]?.trim();
        const equip2 = columnes[3]?.trim() || "";
        const gols2Raw = columnes[4]?.trim();

        const gols1 = (gols1Raw === "" || gols1Raw === undefined) ? null : Number(gols1Raw);
        const gols2 = (gols2Raw === "" || gols2Raw === undefined) ? null : Number(gols2Raw);

        if (grup && equip1 && equip2) {
            partits.push({ 
                grup: grup.toUpperCase(), 
                equip1, 
                gols1: isNaN(gols1) ? null : gols1, 
                equip2, 
                gols2: isNaN(gols2) ? null : gols2 
            });
        }
    }
    return partits;
}

// ==========================================================================
// 2. LÒGICA PER CALCULAR ELS PUNTS DEL MUNDIAL (GRUPS)
// ==========================================================================
function calcularGrups(partits) {
    const grups = {};
    const rondesEliminatories = ["VUITENS", "QUARTS", "SEMIS", "FINAL"];
    
    function obtenirEquip(nom, nomGrup) {
        if (!grups[nomGrup]) grups[nomGrup] = {};
        if (!grups[nomGrup][nom]) {
            grups[nomGrup][nom] = { nom: nom, pj: 0, pg: 0, pe: 0, pp: 0, pts: 0, gf: 0, gc: 0, grupOriginal: nomGrup };
        }
        return grups[nomGrup][nom];
    }

    partits.forEach(p => {
        if (rondesEliminatories.includes(p.grup)) return; 

        if (p.gols1 !== null && p.gols2 !== null && !isNaN(p.gols1) && !isNaN(p.gols2)) {
            const e1 = obtenirEquip(p.equip1, p.grup);
            const e2 = obtenirEquip(p.equip2, p.grup);

            e1.pj++; e2.pj++;
            e1.gf += p.gols1; e1.gc += p.gols2;
            e2.gf += p.gols2; e2.gc += p.gols1;

            if (p.gols1 > p.gols2) {
                e1.pg++; e1.pts += 3; e2.pp++;
            } else if (p.gols1 < p.gols2) {
                e2.pg++; e2.pts += 3; e1.pp++;
            } else {
                e1.pe++; e1.pts += 1; e2.pe++; e2.pts += 1;
            }
        } else {
            obtenirEquip(p.equip1, p.grup);
            obtenirEquip(p.equip2, p.grup);
        }
    });

    const grupsOrdenats = {};
    for (const nomGrup in grups) {
        grupsOrdenats[nomGrup] = Object.values(grups[nomGrup]).sort((a, b) => 
            b.pts - a.pts || 
            (b.gf - b.gc) - (a.gf - a.gc) || 
            b.gf - a.gf
        );
    }
    return grupsOrdenats;
}

// ==========================================================================
// 3. GENERAR TOT EL QUADRE D'ELIMINATÒRIES TOTALMENT DINÀMIC
// ==========================================================================
function calcularFaseFinalCompleta(dadesGrups, partitsCSV) {
    const fases = { VUITENS: [], QUARTS: [], SEMIS: [], FINAL: [] };
    
    const llistaGrups = Object.keys(dadesGrups).filter(g => g !== "VUITENS" && g !== "QUARTS" && g !== "SEMIS" && g !== "FINAL").sort();
    if (llistaGrups.length === 0) return fases;

    let totsElsGrupsTancats = true;
    llistaGrups.forEach(g => {
        const equips = dadesGrups[g];
        const partitsEsperats = equips.length - 1;
        const grupTancat = equips.length > 0 && equips.every(e => e.pj === partitsEsperats);
        if (!grupTancat) totsElsGrupsTancats = false;
    });

    const esCas12Equips = llistaGrups.length === 3;
    const primeraRondaReal = esCas12Equips ? "QUARTS" : (Object.values(dadesGrups).flat().length > 16 ? "VUITENS" : "QUARTS");

    function buscarResultatCSV(ronda, eq1, eq2) {
        return partitsCSV.find(p => p.grup === ronda && 
            ((p.equip1 === eq1 && p.equip2 === eq2) || (p.equip1 === eq2 && p.equip2 === eq1))
        );
    }

    if (esCas12Equips) {
        let q1_1, q1_2, q2_1, q2_2, q3_1, q3_2, q4_1, q4_2;

        if (totsElsGrupsTancats) {
            const A1 = dadesGrups["A"][0].nom;
            const A2 = dadesGrups["A"][1].nom;
            const B1 = dadesGrups["B"][0].nom;
            const B2 = dadesGrups["B"][1].nom;
            const C1 = dadesGrups["C"][0].nom;
            const C2 = dadesGrups["C"][1].nom;

            const tercers = [
                { grup: "A", dades: dadesGrups["A"][2] },
                { grup: "B", dades: dadesGrups["B"][2] },
                { grup: "C", dades: dadesGrups["C"][2] }
            ];
            
            tercers.sort((a, b) => 
                b.dades.pts - a.dades.pts || 
                (b.dades.gf - b.dades.gc) - (a.dades.gf - a.dades.gc) || 
                b.dades.gf - a.dades.gf
            );

            const millorTercer = tercers[0];
            const segonMillorTercer = tercers[1];
            const tercerEliminat = tercers[2];

            q1_1 = A1; 
            q1_2 = (tercerEliminat.grup === "C") ? segonMillorTercer.dades.nom : millorTercer.dades.nom;
            q2_1 = B1; 
            q2_2 = (tercerEliminat.grup === "C") ? millorTercer.dades.nom : segonMillorTercer.dades.nom;
            q3_1 = C1; 
            q3_2 = A2;
            q4_1 = B2; 
            q4_2 = C2;
        } else {
            q1_1 = "1r Grup A"; q1_2 = "Millor 3r A/B/C";
            q2_1 = "1r Grup B"; q2_2 = "2n Millor 3r A/B/C";
            q3_1 = "1r Grup C"; q3_2 = "2n Grup A";
            q4_1 = "2n Grup B"; q4_2 = "2n Grup C";
        }

        const partitsQuarts = [{ e1: q1_1, e2: q1_2 }, { e1: q2_1, e2: q2_2 }, { e1: q3_1, e2: q3_2 }, { e1: q4_1, e2: q4_2 }];
        partitsQuarts.forEach(q => {
            const csv = buscarResultatCSV("QUARTS", q.e1, q.e2);
            fases.QUARTS.push({ grup: "QUARTS", equip1: q.e1, gols1: csv?.gols1 ?? null, equip2: q.e2, gols2: csv?.gols2 ?? null });
        });

    } else {
        let rankingGlobal = [];
        llistaGrups.forEach(g => {
            dadesGrups[g].forEach((eq, idx) => {
                rankingGlobal.push({ ...eq, pos: idx + 1 });
            });
        });
        
        rankingGlobal.sort((a,b) => a.pos - b.pos || b.pts - a.pts);
        const llistaNoms = rankingGlobal.map(e => e.nom);

        if (primeraRondaReal === "VUITENS") {
            for (let i = 0; i < 8; i++) {
                const eq1 = totsElsGrupsTancats ? llistaNoms[i] : `1r/2n general`;
                const eq2 = totsElsGrupsTancats ? llistaNoms[15 - i] : `3r/4t general`;
                const csv = buscarResultatCSV("VUITENS", eq1, eq2);
                fases.VUITENS.push({ grup: "VUITENS", equip1: eq1, gols1: csv?.gols1 ?? null, equip2: eq2, gols2: csv?.gols2 ?? null });
            }
        } else if (primeraRondaReal === "QUARTS") {
            for (let i = 0; i < 4; i++) {
                const eq1 = totsElsGrupsTancats ? llistaNoms[i] : `1r del grup`;
                const eq2 = totsElsGrupsTancats ? llistaNoms[7 - i] : `2n/3r del grup`;
                const csv = buscarResultatCSV("QUARTS", eq1, eq2);
                fases.QUARTS.push({ grup: "QUARTS", equip1: eq1, gols1: csv?.gols1 ?? null, equip2: eq2, gols2: csv?.gols2 ?? null });
            }
        }
    }

    for (let i = 0; i < 2; i++) {
        const pQ1 = fases.QUARTS[i*2];
        const pQ2 = fases.QUARTS[i*2 + 1];
        const eq1 = pQ1 && pQ1.gols1 !== null ? (pQ1.gols1 > pQ1.gols2 ? pQ1.equip1 : pQ1.equip2) : `Guanyador Q${i*2 + 1}`;
        const eq2 = pQ2 && pQ2.gols1 !== null ? (pQ2.gols1 > pQ2.gols2 ? pQ2.equip1 : pQ2.equip2) : `Guanyador Q${i*2 + 2}`;
        const csv = buscarResultatCSV("SEMIS", eq1, eq2);
        fases.SEMIS.push({ grup: "SEMIS", equip1: eq1, gols1: csv?.gols1 ?? null, equip2: eq2, gols2: csv?.gols2 ?? null });
    }

    const eq1Final = fases.SEMIS[0] && fases.SEMIS[0].gols1 !== null ? (fases.SEMIS[0].gols1 > fases.SEMIS[0].gols2 ? fases.SEMIS[0].equip1 : fases.SEMIS[0].equip2) : "Finalista 1";
    const eq2Final = fases.SEMIS[1] && fases.SEMIS[1].gols1 !== null ? (fases.SEMIS[1].gols1 > fases.SEMIS[1].gols2 ? fases.SEMIS[1].equip1 : fases.SEMIS[1].equip2) : "Finalista 2";
    const csvFinal = buscarResultatCSV("FINAL", eq1Final, eq2Final);
    fases.FINAL.push({ grup: "FINAL", equip1: eq1Final, gols1: csvFinal?.gols1 ?? null, equip2: eq2Final, gols2: csvFinal?.gols2 ?? null });

    return fases;
}

// Neteja l'extensió i guionets per fer el títol maco i en majúscules
function formatarNomTorneig(nomFitxer) {
    return nomFitxer.replace(".csv", "").replace(/_/g, " ").toUpperCase();
}

// ==========================================================================
// 4. DIBUIXAR LES PÀGINES WEB (VISTES HTML)
// ==========================================================================
function dibuixarWeb(partits, nomFitxerActual) {
    const titolH1 = document.getElementById("nom-torneig-titol");
    const contenidorClasificacio = document.getElementById("contenidor-clasificacio");
    const llistaPartits = document.getElementById("llista-partits");
    const contenidorEliminatories = document.getElementById("contenidor-eliminatories");

    // Canviar sempre el títol H1 al nom del torneig actual en MAJÚSCULES
    if (titolH1 && nomFitxerActual) {
        titolH1.innerText = "🏆 " + formatarNomTorneig(nomFitxerActual);
    }

    const dadesGrups = calcularGrups(partits);

    // 4.1 VISTA INDEX.HTML
    if (contenidorClasificacio) {
        let HTMLFinal = "";
        for (const nomGrup in dadesGrups) {
            let taulaHTML = `<div class="grup-box"><h3>Grup ${nomGrup}</h3><table><thead><tr><th>Pos</th><th>Equip</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF:GC</th><th>PTS</th></tr></thead><tbody>`;
            dadesGrups[nomGrup].forEach((equip, index) => {
                taulaHTML += `<tr class="passa-ronda"><td>${index + 1}</td><td><strong>${equip.nom}</strong></td><td>${equip.pj}</td><td>${equip.pg}</td><td>${equip.pe}</td><td>${equip.pp}</td><td>${equip.gf}:${equip.gc}</td><td class="pts">${equip.pts}</td></tr>`;
            });
            taulaHTML += `</tbody></table></div>`;
            HTMLFinal += taulaHTML;
        }
        contenidorClasificacio.innerHTML = HTMLFinal;
    }

    // 4.2 VISTA PARTITS.HTML
    if (llistaPartits) {
        let HTMLPartits = "";
        const partitsPerGrup = {};
        partits.forEach(p => {
            if (!partitsPerGrup[p.grup]) partitsPerGrup[p.grup] = [];
            partitsPerGrup[p.grup].push(p);
        });

        for (const nomGrup in partitsPerGrup) {
            let grupPartitsHTML = `<div class="grup-partits"><h3>${["VUITENS", "QUARTS", "SEMIS", "FINAL"].includes(nomGrup) ? nomGrup : "Grup " + nomGrup}</h3>`;
            partitsPerGrup[nomGrup].forEach(p => {
                const resultatText = (p.gols1 !== null && p.gols2 !== null) ? `${p.gols1} - ${p.gols2}` : "vs";
                grupPartitsHTML += `<div class="partit"><span class="equip">${p.equip1}</span><span class="resultat">${resultatText}</span><span class="equip">${p.equip2}</span></div>`;
            });
            grupPartitsHTML += `</div>`;
            HTMLPartits += grupPartitsHTML;
        }
        llistaPartits.innerHTML = HTMLPartits;
    }

    // 4.3 VISTA ELIMINATORIES.HTML
    if (contenidorEliminatories) {
        const totesLesFases = calcularFaseFinalCompleta(dadesGrups, partits);
        const rondes = ["VUITENS", "QUARTS", "SEMIS", "FINAL"];
        let HTMLEliminatories = `<div class="bracket-wrapper">`;

        rondes.forEach(ronda => {
            const partitsRonda = totesLesFases[ronda];
            if (!partitsRonda || partitsRonda.length === 0) return;

            HTMLEliminatories += `<div class="bracket-column"><h3 class="ronda-titol">${ronda}</h3>`;
            partitsRonda.forEach(p => {
                const resText = (p.gols1 !== null && p.gols2 !== null) ? `${p.gols1} - ${p.gols2}` : "vs";
                let guanyador1 = "", guanyador2 = "";
                if (p.gols1 !== null && p.gols2 !== null) {
                    guanyador1 = p.gols1 > p.gols2 ? "guanyador" : "";
                    guanyador2 = p.gols2 > p.gols1 ? "guanyador" : "";
                }
                HTMLEliminatories += `
                    <div class="matchup">
                        <div class="matchup-equip ${guanyador1}">${p.equip1}</div>
                        <div class="matchup-score">${resText}</div>
                        <div class="matchup-equip ${guanyador2}">${p.equip2}</div>
                    </div>
                `;
            });
            HTMLEliminatories += `</div>`;
        });

        const partitFinal = totesLesFases.FINAL[0];
        let nomCampio = "Per definir";
        let textCampioMostrat = "";

        if (partitFinal && partitFinal.gols1 !== null && partitFinal.gols2 !== null) {
            nomCampio = partitFinal.gols1 > partitFinal.gols2 ? partitFinal.equip1 : partitFinal.equip2;
            textCampioMostrat = "🏆 " + nomCampio + " 🏆";
        } else {
            textCampioMostrat = nomCampio;
        }

        HTMLEliminatories += `
            <div class="bracket-column columna-campio">
                <h3 class="ronda-titol">🏆 Campió</h3>
                <div class="matchup campio-box ${partitFinal && partitFinal.gols1 !== null ? 'hi-ha-campio' : ''}">
                    <div class="campio-nom">${textCampioMostrat}</div>
                </div>
            </div>
        `;
        HTMLEliminatories += `</div>`;
        contenidorEliminatories.innerHTML = HTMLEliminatories;
    }
}

// ==========================================================================
// 5. ENGINY HISTÒRIC DE PALMARÈS
// ==========================================================================
function generarPalmares(llistaFichers) {
    const contenidorPalmares = document.getElementById("contenidor-palmares");
    if (!contenidorPalmares) return;

    contenidorPalmares.innerHTML = "<p>Buscant campions de la història...</p>";
    let targetesHTML = "";
    
    // Promeses per carregar en paral·lel tots els CSVs i extreure'n el campió
    const operacionsCarga = llistaFichers.map(fitxer => {
        return fetch(`tornejos/${fitxer}`)
            .then(res => res.ok ? res.text() : null)
            .then(csvText => {
                if (!csvText) return;
                const partits = parsejarCSV(csvText);
                const dadesGrups = calcularGrups(partits);
                const fases = calcularFaseFinalCompleta(dadesGrups, partits);
                
                const finalPartit = fases.FINAL[0];
                // Si té resultat la final, tenim un campió històric legítim!
                if (finalPartit && finalPartit.gols1 !== null && finalPartit.gols2 !== null) {
                    const guanyador = finalPartit.gols1 > finalPartit.gols2 ? finalPartit.equip1 : finalPartit.equip2;
                    const nomTorneigEstilitzat = formatarNomTorneig(fitxer);

                    targetesHTML += `
                        <div class="palmares-card">
                            <div class="palmares-torneig">${nomTorneigEstilitzat}</div>
                            <div class="palmares-corona">👑</div>
                            <div class="palmares-campio">${guanyador}</div>
                            <div class="palmares-res">Resultat Final: ${finalPartit.gols1} - ${finalPartit.gols2}</div>
                        </div>
                    `;
                }
            }).catch(e => console.error("Error processant fitxer palmarès:", fitxer, e));
    });

    Promise.all(operacionsCarga).then(() => {
        if (targetesHTML === "") {
            contenidorPalmares.innerHTML = "<p>Encara no hi ha cap torneig finalitzat al palmarès.</p>";
        } else {
            contenidorPalmares.innerHTML = targetesHTML;
        }
    });
}

// ==========================================================================
// 6. INICIALITZADOR GLOBAL (LLEGEIX EL JSON CENTRAL)
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    fetch("tornejos/tornejos.json")
        .then(response => {
            if (!response.ok) throw new Error("Falta el fitxer tornejos.json central!");
            return response.json();
        })
        .then(config => {
            const fitxerActual = config.torneig_actual;
            const totsElsFitxers = config.llista_tornejos;

            // Carrega les dades del torneig actual de la carpeta 'tornejos/'
            fetch(`tornejos/${fitxerActual}`)
                .then(res => {
                    if (!res.ok) throw new Error(`No es troba el fitxer tornejos/${fitxerActual}`);
                    return res.text();
                })
                .then(csvData => {
                    const partits = parsejarCSV(csvData);
                    dibuixarWeb(partits, fitxerActual);
                });

            // Si estem a la pàgina de palmarès, processem l'històric
            generarPalmares(totsElsFitxers);
        })
        .catch(err => console.error("Error inicialitzant l'aplicació:", err));
});