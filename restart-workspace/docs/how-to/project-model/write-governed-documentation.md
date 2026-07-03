# How-to — Scrivere documentazione governata

Questa how-to è un appunto operativo collegato a MR-0001 e ADR-0001. Non introduce regole normative autonome.

## Quando usarla

Usa questa how-to quando scrivi o rivedi:

- macrorequisiti;
- decisioni / ADR;
- requisiti;
- reference;
- explanation;
- how-to operative;
- documentazione destinata a LLM.

## Obiettivo

Scrivere documentazione sintetica, leggibile, non duplicata e collegabile a registri, requisiti, asset, grafi e controlli deterministici.

## Procedura

### 1. Parti dal macrorequisito

Individua il macrorequisito che rappresenta il tema principale.

Se il tema non esiste, non creare subito una ADR: prima proponi o chiarisci il macrorequisito.

### 2. Usa il macrorequisito come contesto generale

Il macrorequisito contiene il contesto generale del tema.

Non ripetere quel contesto nelle ADR collegate.

### 3. Scrivi una ADR solo per una scelta circoscritta

Una ADR deve decidere un punto specifico dentro il macrorequisito.

Evita ADR che spiegano tutto il macrorequisito.

Nel `Context` della ADR scrivi solo il problema locale che rende necessaria la decisione.

### 4. Tieni il follow-up vicino alla decisione

Un follow-up deve derivare direttamente dalla decisione.

Se un follow-up riguarda un altro tema, probabilmente serve un'altra ADR, un requisito o un punto del working plan.

### 5. Deriva requisiti dalla decisione

Dopo la ADR, individua i requisiti verificabili prodotti dalla decisione.

Non creare requisiti generici scollegati dalla decisione.

### 6. Collega i requisiti specializzati

Un requisito di sicurezza, privacy, audit, compliance, qualità o operabilità deve essere collegato ad almeno un requisito funzionale.

Prima di scrivere un requisito specializzato chiediti quale comportamento funzionale protegge, limita, traccia o verifica.

### 7. Identifica gli asset

Quando un documento nomina un asset rilevante, usa un ID o un nome canonico se l'asset è già governato.

Se l'asset non esiste ancora nel registro, trattalo come candidato e non moltiplicare sinonimi nel testo.

### 8. Classifica il documento con Diátaxis

Scegli il ruolo del documento:

- tutorial: apprendimento guidato;
- how-to guide: procedura operativa;
- reference: fonte ordinata e normativa quando collegata a oggetti governati;
- explanation: chiarimento del modello, non fonte normativa.

Non mettere regole normative nuove dentro explanation.

### 9. Evita duplicazione manuale

Non scrivere manualmente elenchi derivabili da registri, body, riferimenti canonici o grafi.

Gli indici leggibili, le appendici metadati, le viste per MR e i report devono essere generati o validati quando possibile.

## Checklist rapida

Prima di chiudere un documento, verifica:

- il macrorequisito di riferimento è chiaro;
- il documento ha un solo scopo principale;
- i termini importanti sono canonici o candidati espliciti;
- non ci sono sinonimi inutili per lo stesso concetto;
- le ADR non ripetono il contesto generale del MR;
- i follow-up derivano direttamente dalla decisione;
- i requisiti specializzati sono collegati a requisiti funzionali;
- gli asset sono nominati con ID o nome canonico quando disponibili;
- le informazioni derivabili non sono duplicate manualmente;
- explanation e how-to non introducono regole normative autonome.

## Anti-pattern

Evita:

- ADR che riscrivono il macrorequisito;
- Context usato come riassunto generale del progetto;
- Follow-up usato come contenitore di idee non collegate;
- requisiti di sicurezza o privacy scollegati da funzioni;
- asset descritti con sinonimi diversi in documenti diversi;
- registri usati solo per i tool e non come indici leggibili;
- tabelle metadati manuali nel corpo principale quando possono stare in appendici generate;
- explanation usata per stabilire regole operative o normative.
