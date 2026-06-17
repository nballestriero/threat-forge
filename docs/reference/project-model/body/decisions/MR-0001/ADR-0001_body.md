# ADR-0001: Adozione del Modello Diátaxis

## 1. Contest (Contesto)

La documentazione tecnica del progetto deve essere stabile, leggibile e facile da navigare per nuovi membri del team, revisori e strumenti automatici. Gli utenti del progetto devono poter distinguere rapidamente una guida passo-passo da un riferimento tecnico, da un tutorial e da una spiegazione architetturale.

Abbiamo bisogno di una struttura rigida e chiara per organizzare i contenuti all'interno della cartella `/docs`.

## 2. Decision (Decisione)

Decidiamo di adottare formalmente il framework **Diátaxis** per tutta la documentazione di progetto.

Questo comporta che:

- La radice della documentazione sarà divisa nelle 4 cartelle canoniche: `tutorials`, `how-to`, `reference`, `explanation`.
- Qualsiasi nuovo file di documentazione dovrà essere classificato in una di queste categorie prima del merge su Git.
- I documenti `reference` conterranno registry, schemi, tassonomie e formati tecnici governati.
- I documenti `explanation` conterranno contesto, principi, teoria, architettura e design rationale.

## 3. Status (Stato)

**Accepted**.

## 4. Consequences (Conseguenze)

### Conseguenze Positive (Benefici)

- Chiara separazione degli scopi del testo.
- Creazione di un percorso di apprendimento guidato (`tutorials`) separato dalle risposte operative (`how-to`).
- Separazione tra reference tecnica governata e spiegazioni architetturali.
- Semplificazione futura delle regole di automazione, lint e validazione documentale.

### Conseguenze Negative (Costi/Rischi)

- Sarà necessario classificare ogni nuovo documento prima del merge.
- Il team dovrà rispettare regole più rigide nella produzione documentale.
- Eventuali documenti scritti fuori struttura dovranno essere spostati o riformulati.
