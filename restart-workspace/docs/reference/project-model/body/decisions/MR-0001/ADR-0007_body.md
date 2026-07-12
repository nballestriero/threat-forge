# ADR-0007 — Integrazione locale di VS Code tramite task governati

## Stato

Draft.

## Contesto

I tool locali governati sono già disponibili come comandi CLI, ma il loro uso quotidiano richiede di ricordare path, argomenti e modalità sicure di esecuzione.

L'integrazione editor deve ridurre questo attrito senza duplicare logica, introdurre una custom extension prematura o trasformare VS Code in una nuova fonte canonica delle regole operative.

I task richiesti coprono più ambiti: check locali, authoring guidato e produzione dell'handoff. Per questo motivo non sono una semplice estensione del solo generatore documentale governato da ADR-0005 e non appartengono alla decisione sull'handoff di ADR-0006.

## Decisione

ThreatForge adotta un catalogo locale di task VS Code come livello di lancio sottile sopra i comandi CLI governati esistenti.

Il catalogo deve:

- usare label visibili con prefisso canonico `ThreatForge:`;
- invocare direttamente i tool esistenti senza replicarne la logica;
- eseguire i comandi dalla root del repository;
- mantenere in `--dry-run` i task di authoring e handoff;
- risiedere sotto `restart-workspace/.vscode/tasks.json` finché `restart-workspace/` resta il workspace tecnico locale;
- non introdurre una custom extension VS Code.

Poiché il file si trova nella cartella tecnica locale, i task vengono caricati aprendo `restart-workspace/` come cartella workspace in VS Code. Il `cwd` dei task viene riportato alla root del repository padre.

## Conseguenze

- I check e i generatori locali diventano accessibili dalla palette `Tasks: Run Task`.
- Le label utente espongono esclusivamente il nome canonico `ThreatForge`.
- Le modifiche ai comandi continuano a essere governate nei tool CLI, non nel catalogo editor.
- Un eventuale schema, snippet o setting dedicato può essere aggiunto in passi successivi.
- Una custom extension resta fuori ambito finché i task locali non risultano insufficienti.
