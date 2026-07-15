# ADR-0002 — Operazione governata di commit e push nella root canonica

## Status

Draft

## Context

La promozione della root canonica ha escluso correttamente i tool operativi del progetto legacy, ma ha lasciato ThreatForge senza un entrypoint governato per verificare, creare un commit e pubblicarlo.

L'uso diretto di `git commit` e `git push` renderebbe facoltativi i gate locali e ricreerebbe una procedura manuale non verificabile.

Il runner legacy rimane un riferimento storico e non rientra nella root operativa.

Le proiezioni deterministiche versionate nel repository, come schemi e adapter generati dalle fonti canoniche, possono diventare obsolete quando cambiano registri o tassonomie. Comandi `--write` separati renderebbero il contenuto del commit dipendente da una procedura manuale esterna al runner governato.

## Decision

ThreatForge introduce nella root canonica un nuovo runner CLI sottile per le operazioni di repository.

Il runner:

- offre una modalità `--check` priva di mutazioni Git e scritture nel repository;
- offre una modalità `--commit-push` con messaggio obbligatorio;
- verifica repository, branch e upstream configurato;
- materializza in modalità `--commit-push` le proiezioni deterministiche attive dichiarate da un registro canonico prima del `repo-check`;
- verifica i confini di scrittura, la validità e l'idempotenza di ogni proiezione materializzata;
- mantiene `tools/repo-check.mjs` come gate esclusivamente read-only;
- esegue il `repo-check` canonico prima di qualsiasi stage, commit o push;
- esegue `git add --all` soltanto dopo il superamento della materializzazione e di tutti i gate;
- controlla il diff staged prima del commit;
- interrompe l'operazione al primo errore;
- ripristina i soli output materializzati quando la fase pre-stage fallisce;
- usa il normale upstream Git senza incorporare nomi di remote o branch.

Il runner non contiene la logica dei singoli checker o materializzatori. Il registro letto da `tools/repo-check.mjs` rimane la fonte canonica dell'insieme dei gate; un registro separato letto dal runner rimane la fonte canonica dei materializzatori e dei relativi output dichiarati.

## Consequences

- Benefit: Il comando governato è disponibile senza dipendere dal progetto legacy.
- Benefit: CLI, VS Code, app ThreatForge e CI invocano lo stesso entrypoint.
- Benefit: Le proiezioni deterministiche vengono aggiornate e incluse nello stesso commit delle fonti canoniche che le modificano.
- Benefit: L'autore non esegue manualmente comandi `--write` nel normale flusso di commit e push.
- Constraint: `repo-check` e la modalità `--check` del runner restano privi di side effect.
- Constraint: Ogni modifica al runner resta collegata a Requirement e controlli deterministici della root canonica.
