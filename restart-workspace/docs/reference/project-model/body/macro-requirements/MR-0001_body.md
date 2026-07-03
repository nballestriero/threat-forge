# MR-0001 — Gestione documentale governata

Questo testo è un appunto di revisione e non modifica ancora il modello canonico del progetto.

## Scopo

Gestione documentale governata definisce come threat-forge descrive, organizza, collega, consulta e controlla la documentazione del progetto.

La documentazione governata è il modello primario per esprimere intenti, decisioni, requisiti, asset, confini, controlli e verifiche.

La documentazione governata deve essere sintetica, standard, leggibile e controllabile.

## Il macrorequisito è il tema principale

Un macrorequisito rappresenta un tema principale del progetto.

Nel documento leggibile generato, ogni macrorequisito può diventare un capitolo del libro del progetto.

Il macrorequisito fornisce il contesto generale del tema.

Le decisioni collegate al macrorequisito precisano scelte specifiche dentro quel tema.

Una decisione non deve ripetere il contesto generale già espresso dal macrorequisito.

I requisiti collegati alle decisioni descrivono le conseguenze verificabili delle scelte.

La lettura principale deve seguire il tema del macrorequisito, non il tipo tecnico del documento.

## Struttura di lettura derivata

La documentazione leggibile generata deve poter presentare ogni macrorequisito con questa struttura:

- introduzione del macrorequisito;
- indice locale del capitolo;
- decisioni collegate al macrorequisito;
- requisiti derivati da ogni decisione;
- requisiti specializzati collegati ai requisiti funzionali;
- asset coinvolti;
- vocabolari, tassonomie e termini canonici collegati;
- relazioni di grafo rilevanti;
- controlli e verifiche collegati;
- how-to operative collegate alle decisioni e ai requisiti;
- appendici metadati derivate.

Gli indici locali, gli elenchi di decisioni, gli elenchi di requisiti, gli asset collegati e le appendici metadati non devono essere duplicati manualmente nel testo del macrorequisito quando possono essere derivati da registri, body, riferimenti canonici o grafi.

## Lettori supportati

La documentazione governata deve supportare più lettori:

- persone non tecniche, entro un livello ragionevole di comprensione;
- sviluppatori;
- LLM;
- controlli deterministici.

La stessa informazione non deve essere riscritta manualmente per lettori diversi.

Quando possibile, viste leggibili, guide, indici, diagrammi, appendici e report devono essere derivati dai sorgenti governati.

## Principi documentali

La documentazione governata deve usare termini canonici.

I termini canonici devono provenire da registri, tassonomie, vocabolari controllati o oggetti governati già definiti.

La prosa libera può essere usata per spiegare, ma non deve sostituire i sorgenti canonici.

Le informazioni derivabili non devono essere mantenute manualmente in più punti.

Il modello deve distinguere contenuto libero, campi obbligatori e campi controllati.

I campi obbligatori servono a identificare il documento, il tipo di documento, il ciclo di vita, il livello di autorità e il rapporto tra sorgente canonico e output derivato.

I campi controllati devono usare valori provenienti da registri, tassonomie o vocabolari controllati.

## Organizzazione documentale

La documentazione governata deve usare il Diátaxis framework come modello di organizzazione documentale.

Diátaxis distingue:

- tutorial;
- how-to guide;
- reference;
- explanation.

In threat-forge, questa distinzione serve a separare percorsi guidati, istruzioni operative, documentazione normativa di riferimento e spiegazioni.

La documentazione explanation può chiarire il modello, ma non deve diventare fonte canonica di requisiti, registri, schema, procedure verificabili o controlli deterministici.

## Decisioni

Una decisione governa una scelta specifica dentro il perimetro di un macrorequisito.

Una decisione può essere registrata tramite formato ADR o formato equivalente.

Una decisione non deve coprire l’intero macrorequisito, ma un punto circoscritto del tema rappresentato dal macrorequisito.

Una decisione deve aumentare la precisione del modello solo sul punto che decide.

Nel documento leggibile generato, le decisioni devono essere presentate dentro il capitolo del macrorequisito a cui appartengono.

## How-to operative

Una how-to descrive come applicare operativamente decisioni, requisiti, reference e registri.

Una how-to deve essere seguita da sviluppatori e LLM quando svolgono l'attività descritta.

Una how-to non deve introdurre regole normative autonome non presenti nei sorgenti governati.

Se una regola pratica diventa vincolante, deve essere ricondotta a macrorequisito, decisione, requisito, reference o controllo deterministico.

## Requisiti

Un requisito funzionale descrive una capacità, un comportamento o un risultato atteso.

Un requisito specializzato descrive un vincolo, controllo o qualità applicato a un requisito funzionale.

I requisiti specializzati possono riguardare sicurezza, privacy, audit, compliance, qualità, usabilità, operabilità o altri contorni governati.

Ogni requisito specializzato deve dichiarare almeno un requisito funzionale a cui si applica.

Nel documento leggibile generato, i requisiti devono essere presentati vicino alla decisione da cui derivano.

## Asset

La documentazione governata deve identificare gli asset rilevanti per il progetto.

Un asset è un oggetto rilevante per funzionamento, documentazione, sicurezza, privacy, audit o futura threat analysis.

Quando un asset diventa rilevante per il modello, deve avere un ID stabile, un nome canonico e una descrizione sintetica.

La definizione canonica di un asset deve vivere in un registro asset o in un sorgente governato equivalente.

I documenti possono introdurre, motivare, usare o vincolare un asset, ma non devono ridefinirlo liberamente con sinonimi o significati diversi.

Ogni documento che nomina un asset governato deve riferirlo tramite ID o nome canonico.

## Registri

Un registro è sia un indice navigabile sia una fonte per controlli deterministici.

Un registro deve aiutare persone, sviluppatori e LLM a esplorare la documentazione.

Un registro deve anche permettere ai controlli deterministici di validare identità, relazioni, stati, riferimenti e coperture.

I registri non devono duplicare manualmente informazioni che possono essere derivate da altri sorgenti governati.

## Vocabolari e tassonomie

La documentazione governata deve usare vocabolari controllati e tassonomie per ridurre sinonimi, ambiguità e duplicazioni.

Il modello può ispirarsi a concetti SKOS-like, come termine canonico, label alternative, label nascoste, relazioni gerarchiche e relazioni associative.

L’adozione completa di RDF, SKOS, SHACL o OWL non è parte del macrorequisito iniziale.

## Ciclo di vita documentale

Ogni documento governato deve avere uno stato di ciclo di vita controllato.

Il ciclo di vita deve permettere almeno di distinguere documenti in bozza, documenti attivi, documenti sostituiti, documenti deprecati e documenti rimossi dal modello attivo.

La rimozione di documenti deprecati deve avvenire tramite un processo governato.

Quando un documento viene rimosso dal modello attivo, il sistema deve conservare una traccia minima sufficiente a non rompere riferimenti, storia, audit e comprensione del modello.

## Grafi e relazioni

La documentazione governata deve collegare gli oggetti governati tramite relazioni esplicite.

I grafi devono rendere navigabili e controllabili le relazioni tra macrorequisiti, decisioni, requisiti, asset, registri, implementazioni e verifiche.

Le relazioni devono essere poche, canoniche e significative.

## Documentazione derivata

La documentazione leggibile per persone e LLM deve poter essere derivata dai sorgenti governati.

La documentazione derivata può includere libro PDF, viste HTML, indici locali, appendici, diagrammi, report di copertura e viste di consultazione rapida.

Nel libro PDF generato, i macrorequisiti possono essere trattati come capitoli principali.

Ogni capitolo di macrorequisito può avere un indice locale generato.

Le decisioni, i requisiti, gli asset, i grafi, le how-to e i controlli devono essere presentati nel contesto del macrorequisito a cui appartengono.

I metadati completi dei documenti governati non devono interrompere la lettura principale. Quando possibile, devono essere raccolti in appendici o viste derivate.

I sorgenti governati devono rimanere minimi, canonici e controllabili.

## Ambito

Include:

- macrorequisiti;
- decisioni;
- requisiti funzionali;
- requisiti specializzati;
- registri;
- asset;
- vocabolari controllati;
- tassonomie;
- ciclo di vita documentale;
- campi obbligatori;
- campi controllati;
- body Markdown governati;
- grafi SPO;
- riferimenti canonici;
- documentazione Diátaxis;
- how-to operative;
- documentazione leggibile derivata;
- indici locali generati;
- appendici metadati derivate;
- viste e report generati o validati deterministicamente.

Fuori ambito:

- implementazione applicativa backend;
- implementazione UI finale;
- runtime di threat analysis;
- integrazioni AI runtime;
- contenuti narrativi non collegati a oggetti governati;
- asset nominati liberamente senza ID o nome canonico;
- requisiti specializzati scollegati da requisiti funzionali;
- indici manuali duplicati che possono essere derivati;
- explanation Diátaxis usata come fonte normativa;
- how-to usata come fonte normativa autonoma;
- adozione obbligatoria iniziale di RDF, SKOS, SHACL o OWL.
