# ADR-0002 — Operazione governata di commit e push nella root canonica

## Stato

Draft.

## Contesto

La promozione della root canonica ha escluso correttamente i tool operativi del progetto legacy, ma ha lasciato ThreatForge senza un entrypoint governato per verificare, creare un commit e pubblicarlo.

L'uso diretto di `git commit` e `git push` renderebbe facoltativi i gate locali e ricreerebbe una procedura manuale non verificabile.

Il runner legacy può essere consultato come riferimento storico, ma non deve essere riattivato, copiato integralmente o collegato alla nuova root.

## Decisione

ThreatForge introduce nella root canonica un nuovo runner CLI sottile per le operazioni di repository.

Il runner deve:

- offrire una modalità `--check` priva di mutazioni Git;
- offrire una modalità `--commit-push` con messaggio obbligatorio;
- verificare repository, branch e upstream configurato;
- eseguire il `repo-check` canonico prima di qualsiasi stage, commit o push;
- eseguire `git add --all` soltanto dopo il superamento dei gate;
- controllare il diff staged prima del commit;
- interrompersi al primo errore senza proseguire con operazioni successive;
- usare il normale upstream Git senza incorporare nomi di remote o branch.

Il runner non contiene logica dei singoli checker. La sorgente canonica dell'insieme dei gate rimane il registro letto da `tools/repo-check.mjs`.

## Conseguenze

- Il comando governato torna disponibile senza dipendere dal progetto legacy.
- CLI, VS Code, app ThreatForge e CI possono invocare lo stesso entrypoint.
- Il catalogo VS Code esistente non viene ancora esteso con commit o push.
- Ogni modifica al comportamento del runner deve restare collegata a requisiti e controlli deterministici della root canonica.
