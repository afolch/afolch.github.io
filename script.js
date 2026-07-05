// ==========================================================================
// 1. NETEJAR I SEPARAR EL TEXT DEL CSV (AMB SUPORT PER A COMENTARIS)
// ==========================================================================
function parsejarCSV(text) {
    const textNet = text.replace(/\r/g, "").replace(/^\uFEFF/, "").trim();
    const linies = textNet.split("\n");
    let partitsFinals = [];
    const equipsPerGrup = {}; 
    const resultatsManuals = {}; // Memòria per guardar els gols que tu escriguis
    
    if (linies.length <= 1) return [];

    for (let i = 0; i < linies.length; i++) {
        const linia = linies[i].trim();
        if (!linia) continue; 

        const separador = linia.includes(";") ? ";" : ",";

        // 1. DETECTAR LLISTA D'EQUIPS
        if (linia.startsWith("#EQUIP")) {
            const parts = linia.split(separador);
            const grupNom = parts[1]?.trim().toUpperCase();
            const equipNom = parts[2]?.trim();
            
            if (grupNom && equipNom) {
                if (!equipsPerGrup[grupNom]) equipsPerGrup[grupNom] = [];
                if (!equipsPerGrup[grupNom].includes(equipNom)) {
                    equipsPerGrup[grupNom].push(equipNom);
                }
            }
            continue;
        }

        if (linia.startsWith("#") || linia.startsWith("//")) continue; 
        if (linia.toLowerCase().startsWith("grup")) continue;

        // 2. LLEGIR PARTITS MANUALS (Resultats que tu afegeixes)
        const columnes = linia.split(separador); 
        if (columnes.length < 5) continue;

        const grup = columnes[0]?.trim().toUpperCase() || "";
        const equip1 = columnes[1]?.trim() || "";
        const gols1Raw = columnes[2]?.trim();
        const equip2 = columnes[3]?.trim() || "";
        const gols2Raw = columnes[4]?.trim();

        const gols1 = (gols1Raw === "" || gols1Raw === undefined) ? null : Number(gols1Raw);
        const gols2 = (gols2Raw === "" || gols2Raw === undefined) ? null : Number(gols2Raw);

        if (grup && equip1 && equip2) {
            if (["VUITENS", "QUARTS", "SEMIS", "FINAL"].includes(grup)) {
                partitsFinals.push({ grup, equip1, gols1: isNaN(gols1) ? null : gols1, equip2, gols2: isNaN(gols2) ? null : gols2 });
            } else {
                const clauPartit = `${grup}_${equip1}_${equip2}`;
                const clauInversa = `${grup}_${equip2}_${equip1}`;
                
                resultatsManuals[clauPartit] = { gols1, gols2 };
                resultatsManuals[clauInversa] = { gols1: gols2, gols2: gols1 };
            }
        }
    }

    // 3. MUNTAR EL CALENDARI COMPLET DE GRUPS (Creuant Sorteig + Gols Manuals)
    for (const grup in equipsPerGrup) {
        const llista = equipsPerGrup[grup];
        const n = llista.length;
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const eq1 = llista[i];
                const eq2 = llista[j];
                
                const clauDirecta = `${grup}_${eq1}_${eq2}`;
                const clauInversa = `${grup}_${eq2}_${eq1}`;
                
                let gols1 = null;
                let gols2 = null;
                
                if (resultatsManuals[clauDirecta] !== undefined) {
                    gols1 = resultatsManuals[clauDirecta].gols1;
                    gols2 = resultatsManuals[clauDirecta].gols2;
                } else if (resultatsManuals[clauInversa] !== undefined) {
                    gols1 = resultatsManuals[clauInversa].gols1;
                    gols2 = resultatsManuals[clauInversa].gols2;
                }

                partitsFinals.push({
                    grup: grup,
                    equip1: eq1,
                    gols1: isNaN(gols1) ? null : gols1,
                    equip2: eq2,
                    gols2: isNaN(gols2) ? null : gols2
                });
            }
        }
    }

    // 🌟 4. ORDENAR ELS PARTITS: JUGATS A DALT, PENDENTS A BAIX
    partitsFinals.sort((a, b) => {
        const aJugat = a.gols1 !== null && a.gols2 !== null;
        const bJugat = b.gols1 !== null && b.gols2 !== null;
        
        if (aJugat && !bJugat) return -1; // 'a' va abans perquè està jugat
        if (!aJugat && bJugat) return 1;  // 'b' va abans perquè està jugat
        return 0;                         // Es manté l'ordre si tots dos són iguals
    });

    return partitsFinals;
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
// 3. GENERAR TOT EL QUADRE D'ELIMINATÒRIES (8 EQUIPS = QUARTS, 16 EQUIPS = VUITENS)
// ==========================================================================
function calcularFaseFinalCompleta(dadesGrups, partitsCSV) {
    const fases = { FINAL: [], SEMIS: [], QUARTS: [], VUITENS: [] };
    
    const llistaGrups = Object.keys(dadesGrups).filter(g => !["FINAL", "SEMIS", "QUARTS", "VUITENS"].includes(g)).sort();
    if (llistaGrups.length === 0) return fases;

    // Comptem el total d'equips al torneig (com que passen tots, és el total de classificats)
    let totalEquipsTorneig = 0;
    llistaGrups.forEach(g => { totalEquipsTorneig += dadesGrups[g].length; });

    // 🌟 LA MATEMÀTICA CORRECTA:
    let primeraRondaReal = "QUARTS"; 
    if (totalEquipsTorneig > 8) {
        primeraRondaReal = "VUITENS"; // Si hi ha 16 equips en total, arrenca a Vuitens
    } else if (totalEquipsTorneig <= 4) {
        primeraRondaReal = "SEMIS";   // Si només fossin 4 equips totals
    }

    function buscarResultatCSV(ronda, eq1, eq2) {
        const n1 = eq1.trim().toLowerCase();
        const n2 = eq2.trim().toLowerCase();
        return partitsCSV.find(p => p.grup === ronda && 
            ((p.equip1.trim().toLowerCase() === n1 && p.equip2.trim().toLowerCase() === n2) || 
             (p.equip1.trim().toLowerCase() === n2 && p.equip2.trim().toLowerCase() === n1))
        );
    }

    const vuitensManuals = partitsCSV.filter(p => p.grup === "VUITENS");
    const quartsManuals = partitsCSV.filter(p => p.grup === "QUARTS");
    const semisManuals = partitsCSV.filter(p => p.grup === "SEMIS");
    const finalManuals = partitsCSV.filter(p => p.grup === "FINAL");

    // --- 1. CONFIGURAR VUITENS DE FINAL (Només si el quadrant és de 16 equips) ---
    if (primeraRondaReal === "VUITENS") {
        if (vuitensManuals.length > 0) {
            fases.VUITENS = [...vuitensManuals];
        } else {
            for (let i = 0; i < 8; i++) {
                fases.VUITENS.push({ grup: "VUITENS", equip1: `Equip Lliga`, gols1: null, equip2: `Equip Lliga`, gols2: null });
            }
        }
    }

    // --- 2. CONFIGURAR QUARTS DE FINAL (La teva ronda inicial actual de 4 partits) ---
    if (quartsManuals.length > 0) {
        // MANA EL TEU CSV: Carreguem les 4 línies de QUARTS que has escrit a mà
        fases.QUARTS = [...quartsManuals];
    } else {
        if (primeraRondaReal === "QUARTS") {
            // Si no hi ha res escrit al CSV, omplim amb text provisional d'espera (4 partits de Quarts)
            for (let i = 0; i < 4; i++) {
                fases.QUARTS.push({ grup: "QUARTS", equip1: `Equip Q${i+1}`, gols1: null, equip2: `Equip Q${i+1}`, gols2: null });
            }
        } else if (primeraRondaReal === "VUITENS") {
            // Si vinguéssim de vuitens (16 equips), els quarts es calcularien amb els guanyadors reals de vuitens
            for (let i = 0; i < 4; i++) {
                const pV1 = fases.VUITENS[i*2]; const pV2 = fases.VUITENS[i*2 + 1];
                let eq1 = `Guanyador V${i*2 + 1}`; let eq2 = `Guanyador V${i*2 + 2}`;
                if (pV1 && pV1.gols1 !== null && pV1.gols2 !== null) eq1 = Number(pV1.gols1) > Number(pV1.gols2) ? pV1.equip1 : pV1.equip2;
                if (pV2 && pV2.gols1 !== null && pV2.gols2 !== null) eq2 = Number(pV2.gols1) > Number(pV2.gols2) ? pV2.equip1 : pV2.equip2;
                const csv = buscarResultatCSV("QUARTS", eq1, eq2);
                fases.QUARTS.push({ grup: "QUARTS", equip1: eq1, gols1: csv?.gols1 ?? null, equip2: eq2, gols2: csv?.gols2 ?? null });
            }
        }
    }

    // --- 3. CONFIGURAR SEMIFINALS (2 partits, surten dels guanyadors dels 4 partits de Quarts) ---
    if (semisManuals.length > 0) {
        fases.SEMIS = [...semisManuals];
    } else {
        for (let i = 0; i < 2; i++) {
            const pQ1 = fases.QUARTS[i*2];     // Partit 1 de la parella de quarts
            const pQ2 = fases.QUARTS[i*2 + 1]; // Partit 2 de la parella de quarts
            
            let eq1 = `Guanyador Q${i*2 + 1}`;
            let eq2 = `Guanyador Q${i*2 + 2}`;

            if (pQ1 && pQ1.gols1 !== null && pQ1.gols2 !== null) {
                eq1 = Number(pQ1.gols1) > Number(pQ1.gols2) ? pQ1.equip1 : pQ1.equip2;
            }
            if (pQ2 && pQ2.gols1 !== null && pQ2.gols2 !== null) {
                eq2 = Number(pQ2.gols1) > Number(pQ2.gols2) ? pQ2.equip1 : pQ2.equip2;
            }

            const csv = buscarResultatCSV("SEMIS", eq1, eq2);
            fases.SEMIS.push({ grup: "SEMIS", equip1: eq1, gols1: csv?.gols1 ?? null, equip2: eq2, gols2: csv?.gols2 ?? null });
        }
    }

    // --- 4. CONFIGURAR FINAL (1 partit, surt dels guanyadors de les 2 Semis) ---
    if (finalManuals.length > 0) {
        fases.FINAL = [...finalManuals];
    } else {
        const pS1 = fases.SEMIS[0];
        const pS2 = fases.SEMIS[1];
        
        let eq1Final = pS1 && pS1.gols1 !== null && pS1.gols2 !== null ? (Number(pS1.gols1) > Number(pS1.gols2) ? pS1.equip1 : pS1.equip2) : "Finalista 1";
        let eq2Final = pS2 && pS2.gols1 !== null && pS2.gols2 !== null ? (Number(pS2.gols1) > Number(pS2.gols2) ? pS2.equip1 : pS2.equip2) : "Finalista 2";

        const csvFinal = buscarResultatCSV("FINAL", eq1Final, eq2Final);
        fases.FINAL.push({ grup: "FINAL", equip1: eq1Final, gols1: csvFinal?.gols1 ?? null, equip2: eq2Final, gols2: csvFinal?.gols2 ?? null });
    }

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
            let grupPartitsHTML = `<div class="grup-partits"><h3>${["FINAL", "SEMIS", "QUARTS", "VUITENS"].includes(nomGrup) ? nomGrup : "Grup " + nomGrup}</h3>`;
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
                    const perdedor = finalPartit.equip1 === guanyador ? finalPartit.equip2 : finalPartit.equip1;
                    const nomTorneigEstilitzat = formatarNomTorneig(fitxer);

                    targetesHTML += `
                        <div class="palmares-card">
                            <div class="palmares-torneig">${nomTorneigEstilitzat}</div>
                            <div class="palmares-corona">👑</div>
                            <div class="palmares-campio">${guanyador}</div>
                            <div class="palmares-res">Resultat Final: ${finalPartit.gols1} - ${finalPartit.gols2}</div>
                            <div class="palmares-subcampio">${perdedor}</div>
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