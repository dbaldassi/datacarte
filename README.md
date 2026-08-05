# Carte des datacenters en France ⚡

Ce projet recense les localisations et les consommations électriques des datacenters en France à partir de données primaires, publiquement accessibles.

## Description 

Le site web permet de visualiser les datacenters sur une carte de France, ainsi que de consulter leur consommation électrique annuelle et leur historique. Il est également possible de filtrer les résultats en fonction de la consommation électrique, de la surface, et de la catégorie de consommation.

## Technologies utilisées

- DuckDB : base de données SQL en mémoire
- Deno : runtime JavaScript et TypeScript 
- Leaf, : bibliothèque JavaScript pour la visualisation de cartes

## Source de données utilisées

Toutes les données concernant les datacenters sont open source et ouvertement accessible.

En ce qui concerne la localisation, nous avons utilisé les données de l'association lenuagaeétaitsousnospieds.org

Pour les données de consommation électriques, nous avons utilisé les statistiques open source de Enedis et RTE, qui s'occupent du transport et de l'acheminement de l'électricité en France.

La base de données n'est pas sur github, elle est téléchargeable depuis le site de datacarte.

## Installation

Le projet utilise Deno comme serveur Web.
Une fois Deno installé, vous pouvez cloner le projet en exécutant la commande suivante :

``` sh
git clone https://github.com/dbaldassi/datacarte.git
```

Ensuite, vous devez naviguer dans le répertoire du projet et installer les dépendances :

``` sh
deno install
```

Enfin, vous pouvez lancer le serveur web en exécutant la commande suivante :

``` sh
deno run dev
```

Le serveur Web sera disponible à l'adresse http://localhost:8000

# French Datacenter electricity consumption map ⚡

This project compiles the locations and electricity consumption of datacenters in France from primary, publicly accessible data.

## Description 

The website allows visualizing datacenters on a map of France, as well as consulting their annual electricity consumption and historical data. It is also possible to filter results based on electricity consumption, surface area, and consumption category.

## Technologies Used

- DuckDB: in-memory SQL database
- Deno: JavaScript/TypeScript runtime 
- Leaflet: JavaScript library for map visualization

## Data Sources Used

All data regarding datacenters is open source and publicly accessible.

Regarding location data, we have used data from the association lenuagaeétaitsousnospieds.org

For electricity consumption data, we have used open source statistics from Enedis and RTE, which handle electricity transport and distribution in France.

The database is not on github, it can be downloaded from the datacarte website.

## Installation

The project uses Deno as a web server.
Once Deno is installed, you can clone the project by running the following command:

``` sh
git clone https://github.com/dbaldassi/datacarte.git
```

Then, navigate to the project directory and install dependencies:

``` sh
deno install
```

Finally, you can start the web server by running the following command:

``` sh
deno run dev
```

The web server will be available at the address http://localhost:8000
