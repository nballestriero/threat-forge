# ADR-0002 — Operazione governata di commit e push nella root canonica

## Stato

Draft.

## Contesto

La promozione della root canonica ha escluso correttamente i tool operativi del progetto legacy, ma ha lasciato ThreatForge senza un entrypoint governato per verificare, creare un commit e pubblicarlo.

L'uso diretto di `git commit` e `git push` renderebbe facoltativi i gate locali e ricreerebbe una procedura manuale non verificabile.

Il runner legacy può essere consultato come riferimento storico, ma non deve essere riattivato, copiato integralmente o collegato alla nuova root.

Le proiezioni deterministiche versionate nel repository, come gli schemi e gli adapter generati dalle fonti canoniche, possono diventare obsolete quando cambiano registri o tassonomie. Richiedere all'autore di ricordare comandi `--write` separati renderebbe il risultato del commit dipendente da una procedura manuale esterna al runner governato.

## Decisione

ThreatForge introduce nella root canonica un nuovo runner CLI sottile per le operazioni di repository.

Il runner deve:

- offrire una modalità `--check` priva di mutazioni Git e di scritture nel repository;
- offrire una modalità `--commit-push` con messaggio obbligatorio;
- verificare repository, branch e upstream configurato;
- materializzare in modalità `--commit-push` le proiezioni deterministiche attive dichiarate da un registro canonico prima del `repo-check`;
- verificare i confini di scrittura, la validità e l'idempotenza di ogni proiezione materializzata;
- mantenere `tools/repo-check.mjs` come gate esclusivamente read-only;
- eseguire il `repo-check` canonico prima di qualsiasi stage, commit o push;
- eseguire `git add --all` soltanto dopo il superamento della materializzazione e di tutti i gate;
- controllare il diff staged prima del commit;
- interrompersi al primo errore senza proseguire con operazioni successive;
- ripristinare i soli output materializzati quando la fase pre-stage fallisce;
- usare il normale upstream Git senza incorporare nomi di remote o branch.

Il runner non contiene logica dei singoli checker o materializzatori. La sorgente canonica dell'insieme dei gate rimane il registro letto da `tools/repo-check.mjs`; la sorgente canonica dei materializzatori e dei relativi output dichiarati rimane un registro separato letto dal runner di repository.

## Conseguenze

- Il comando governato torna disponibile senza dipendere dal progetto legacy.
- CLI, VS Code, app ThreatForge e CI possono invocare lo stesso entrypoint.
- Le proiezioni deterministiche vengono aggiornate e incluse nello stesso commit delle fonti canoniche che le modificano.
- L'autore non deve eseguire manualmente i comandi `--write` nel normale flusso di commit e push.
- `repo-check` e la modalità `--check` del runner restano privi di side effect.
- Ogni modifica al comportamento del runner deve restare collegata a requisiti e controlli deterministici della root canonica.
