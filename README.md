# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Tran Minh Son Le | 352463 |
| Amey Kulkarni | 353055 |
| Somesh Mehra | 353628 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (7th April, 5pm)

**10% of the final grade**

[Milestone 1 submission](./milestone-reports/milestone1/milestone1.md)

## Milestone 2 (7th May, 5pm)

**10% of the final grade**

[Milestone 2 submission](./milestone-reports/milestone2.md)

[Link to website](https://com-480-data-visualization.github.io/project-2023-dunkdata/)

## Milestone 3 (4th June, 5pm)

**80% of the final grade**

[Link to website](https://com-480-data-visualization.github.io/project-2023-dunkdata/)

[Process book]

[Screencast]

Technical setup: Our website is hosted on GitHub pages. The website is built using static HTML, CSS and JavaScript. We have used D3.js for the visualizations. Here is the code structure of our project:

* `milestone-reports`: The milestone reports, as well as the process book, can be found in this folder.

* `docs`: This folder contains the implementation of our website. The entry point of the website is `index.html`, which loads `start.html`, `plot1.html`, `plot2.html`, and `plot3.html` depending on the user's choice. Within `docs`, there are 3 sub-directories: `logos` (containing NBA team logos), `datasets` (containing the datasets used for the visualizations), and `assets`, which contains -- among other things -- the CSS (`css`) and JavaScript (`js`) files used for the website. The `js` folder also contains the D3.js code for the visualizations.

* One can access our website via the link provided above, or by cloning this repository, navigating to the `docs` folder, launching a local server (e.g. via `python -m http.server`), and opening `index.html` in a browser.

## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone
