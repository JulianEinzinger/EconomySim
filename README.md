# EconomySim

# Table of Contents

1. [Pages](#pages)
1. [Game Design Ideas](#game-design-ideas)
   1. [Company-Slot Price Formula](#company-slot-price-scaling-formula)
   1. [Money System](#money-system)
   1. [Business Types](#business-types)
      1. [Retail](#retail)
         1. [Page Layout](#retail-pages)
            1. [Dashboard](#retail-dashboard)
            1. [Inventory](#retail-inventory)
            1. [Economics](#retail-economics)
            1. [Purchase](#retail-purchase)
            1. [Orders](#orders-page)
            1. [Mail](#mail-page)
            1. [Bank](#bank-page)
          1. [Concepts](#retail-concepts)

## Pages

- LogIn / Register - Page
- Company Selection - Page
  - Company Overview
    - Unlock principle: At the start of the game, the player has **no available company slots.**
    - The first company slot is **free.**
    - Additional slots must be unlocked and become **progressively more expensive.**
    - Slot prices are calculated using a **scaling formula**, ensuring each new slot costs significantly more than the previous one.
  - Selecting a company
    - Selecting an **existing company** redirects the player to that company’s **main dashboard.**
    - The layout and available mechanics vary depending on the **company type** (e.g. manufacturing, services, gastronomy).
    - Some companies require **licenses or permits** (e.g. food service license, butcher license) before they can operate.
  - Founding a new company
    - Unlocking a new company slot automatically starts the **company founding process.**
    - During this process, the player selects:
      - Company type
      - Location
      - [idea] Starting capital?
      - Check of required licenses
    - Once completed, the company gets created and is from now on available in the company overview.

## Game Design Ideas

### Company slot price scaling formula

> Company slots use an exponential price scaling system to control expansion speed and act as a long-term economic regulator.

#### Base variant

```math
SlotCost(n) = \begin{cases}
    Basecost * (Growthfactor ^{n-2}) & \text{if }~~ n ≥ 2 \\
    0 & \text{if }~~ n = 1
 \end{cases}
```

#### Scale with player-wealth

```math
SlotCost(n) = Basecost * (Growthfactor ^{n-2}) * (1 + Assets / 1.000.000)
```

<br>

Basecost = 10.000 <br>
Growthfactor = 1.85

### Money System

The money system works as follows: The player has a general bank account, and each company also has an account on its own. If, for example, the company has bills to pay, or wants to purchase products, this has to be done by the company’s bank account. The player can transfer money from the company’s bank account to their personal bank account and vice versa at any time.

### Business Types

#### Retail

The player can set opening times, and has a option to open/close the company. When the company is open, available items could possibly be sold to customers (automatic sale generator).

So, the player buys end-products from the commodity exchange (Warenbörse) in large amounts (e.g. 100 stacks, 1.000 stacks, …).

[💡 idea] Depending on where you buy the items from, they take longer to arrive, based on where your company is located. (probably a bit complicated scaling time, so that it doesn’t take too long, but is still realistic)

On arrival, the items get stored in the warehouse, which of course has limited space.

The warehouse capacity can be upgraded with money.

The player can choose for each item in the warehouse whether to put it up for sale, or maybe just a specific amount and set its price (option to set it netto and brutto getting calculated and vice versa).

##### Page Layout <a name="retail-pages"/>

###### Dashboard-Page <a name="retail-dashboard"/>

Overview of number of sold Items in the last 24h, sales in the last 24h, profit in the last 24h

###### Inventory-Page <a name="retail-inventory"/>

Overview of the inventory, including its current size (in m³?) and the items stored currently, and a possibility to purchase more space.

###### Economics-Page <a name="retail-economics"/>

Overview of all-time sales, profit, loss, best product. Some form of profit-and-loss statement, a possibility to take a loan from the bank, and to deposit/withdraw money to generate deposit interest and having to pay interest on the credit.

###### Purchase-Page <a name="retail-purchase"/>

On the Purchase Page, the player accesses the commodity exchange and can choose from a variety of wholesalers. These differ in location, available supply and price.
After selecting a wholesaler, the player is presented with an overview of all available products. For each product, the following information is displayed:

- order unit (stack size)
- price per stack
- volume per stack

The player can add or remove products from the shopping cart and sees the **current total price updated in real time.**

Upon buying, the player can choose whether to pay right now or to purchase on target.

Improvement ideas:

- Implement delivery time based on the wholesaler’s location and the player’s company.
- Add shipping costs that scale with distance and order volume.
- VAT handling, including reclaiming input tax from the tax office.

###### Orders-Page

On the Orders Page, the player is confronted with an overview of all open orders, including all products in the specific order, its total and whether it has been paid off already, and if not, on what date it is due.

###### Mail-Page

Access to mails, e.g. a payment reminder from a wholesaler or mails from the bank.

###### Bank-Page

Access to bank accounts, option to take loans, open new accounts, transfer money.

##### Concepts <a name="retail-concepts"/>

###### Sales Generation

Das Sales Generation System kombiniert **Kundenfrequenz**, **preisbasierte Kaufwahrscheinlichkeit** und **Nachfrage-Modifikatoren**, um realistische Verkäufe zu simulieren.

-----

### Grundprinzip

Verkäufe werden in **Ticks** berechnet. Ein Tick entspricht einer Spielstunde (konfigurierbar). Pro Tick wird für jedes zum Verkauf stehende Produkt berechnet, wie viele Einheiten verkauft werden.

```
VerkäufeProTick(p) = floor(
    Kundenfrequenz
    * Kaufwahrscheinlichkeit(p)
    * NachfrageModifikator(p)
)
```

Das Ergebnis wird auf eine ganze Zahl abgerundet. Die verkaufte Menge ist zusätzlich durch den **verfügbaren Lagerbestand** gedeckelt.

-----

### 1. Kundenfrequenz

Die Kundenfrequenz bestimmt, wie viele potenzielle Kunden pro Tick das Geschäft besuchen.

```
Kundenfrequenz = BasisFrequenz * Standortfaktor * Tageszeitfaktor * Wochentagsfaktor
```

|Variable          |Beschreibung                                         |
|------------------|-----------------------------------------------------|
|`BasisFrequenz`   |Fester Wert je nach Unternehmenstyp, z.B. 50 Kunden/h|
|`Standortfaktor`  |Großstadt = 1.5, Kleinstadt = 0.8, Dorf = 0.4        |
|`Tageszeitfaktor` |Siehe Tabelle unten                                  |
|`Wochentagsfaktor`|Mo–Fr = 1.0, Sa = 1.3, So = 0.5 (sofern geöffnet)    |

**Tageszeitfaktoren (Beispiel):**

|Uhrzeit  |Faktor                     |
|---------|---------------------------|
|00–06 Uhr|0.0 (geschlossen empfohlen)|
|06–09 Uhr|0.6                        |
|09–12 Uhr|1.2                        |
|12–14 Uhr|1.5 (Mittagspeak)          |
|14–17 Uhr|1.0                        |
|17–20 Uhr|1.4 (Feierabendpeak)       |
|20–22 Uhr|0.7                        |
|22–24 Uhr|0.2                        |


> Öffnungszeiten des Spielers wirken wie ein hard cutoff: Außerhalb der Öffnungszeiten ist der Faktor automatisch `0`.

-----

### 2. Kaufwahrscheinlichkeit

Jeder Kunde kauft ein Produkt nur, wenn der Preis attraktiv genug ist. Die Wahrscheinlichkeit basiert auf einer **logistischen Funktion**, die bei Marktpreis genau 50% liefert und symmetrisch ab- bzw. zunimmt:

```
Kaufwahrscheinlichkeit(p) = 1 / (1 + e^(Elastizität * (PriceRatio(p) - 1)))
```

```
PriceRatio(p) = Spielerpreis(p) / Marktpreis(p)
```

**Probe mit `Elastizität = 2`, `PriceRatio = 1.0` (genau Marktpreis):**

```
1 / (1 + e^(2 * (1.0 - 1))) = 1 / (1 + e^0) = 1 / (1 + 1) = 0.5  ✓  → 50%
```

**Weitere Werte bei `Elastizität = 2`:**

|PriceRatio|Bedeutung          |Kaufwahrscheinlichkeit|
|----------|-------------------|----------------------|
|0.7       |30% unter Markt    |~65%                  |
|1.0       |Genau Marktpreis   |50%                   |
|1.2       |20% über Markt     |~40%                  |
|1.5       |50% über Markt     |~27%                  |
|2.0       |Deutlich überteuert|~12%                  |

Der **Elastizitätswert** ist produktabhängig:

- Güter des täglichen Bedarfs (Brot, Wasser): `Elastizität = 2.0` → Kunden reagieren stark auf Preise
- Luxusgüter oder Nischenprodukte: `Elastizität = 0.8` → weniger preissensitiv

-----

### 3. Marktpreis

Der Marktpreis je Produkt ist kein fixer Wert, sondern **fluktuiert** über Zeit, beeinflusst durch:

- Globales Angebot & Nachfrage (intern simuliert)
- Saison (z.B. höhere Preise für Winterprodukte im Winter)
- Marktereignisse (z.B. Lieferengpass → Preisspike)

```
Marktpreis(t) = Basispreis * (1 + Volatilität * sin(t / Periode) + ZufallsRauschen)
```

`ZufallsRauschen` liegt typisch im Bereich `[-0.05, +0.05]`, Volatilität bei `0.1–0.3` je nach Produktkategorie.

-----

### 4. Nachfrage-Modifikatoren

Zusätzlich zur Kaufwahrscheinlichkeit wirken produkt- und kontextbezogene Modifikatoren:

|Modifikator                |Effekt                                     |
|---------------------------|-------------------------------------------|
|Kein Lagerbestand          |Verkäufe = 0 (hartes Limit)                |
|Produkt neu im Sortiment   |+10% für erste 24h (Neuheitsfaktor)        |
|Produkt dauerhaft verfügbar|-5% pro Woche (Sättigungseffekt, max. -30%)|
|Saison passend             |+15% (z.B. Sonnencreme im Sommer)          |
|Saison unpassend           |-20%                                       |

-----

### Zusammenfassung der Parameter (Konfigurationstabelle)

|Parameter       |Standardwert |Beschreibung                        |
|----------------|-------------|------------------------------------|
|`BasisFrequenz` |50           |Kunden pro Tick (Stunde)            |
|`Elastizität`   |2.0          |Standard-Preissensitivität          |
|`Volatilität`   |0.15         |Marktpreisschwankung                |
|`SättigungsRate`|-5% / Woche  |Nachfragerückgang bei Dauerprodukten|
|`MaxSättigung`  |-30%         |Untergrenze des Sättigungseffekts   |
|`TickDauer`     |1 Spielstunde|Wie oft Verkäufe berechnet werden   |
