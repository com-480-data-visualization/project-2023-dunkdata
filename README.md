# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Son Le | 352463 |
| Amey Kulkarni | 353055 |
| Somesh Mehra | 353628 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (7th April, 5pm)

**10% of the final grade**

This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
Please, fill the following sections about your project.

*(max. 2000 characters per section)*

### Dataset

We will be using data primarily from 2 sources: [NBA](https://www.nba.com/) for official NBA related data/statistics, and [FiveThirtyEight](https://data.fivethirtyeight.com/) for additional advanced NBA stats.

#### _FiveThirtyEight data_

The data from FiveThirtyEight is directly downloaded from their website. In particular, we use two datasets: [nba-raptor](https://github.com/fivethirtyeight/data/tree/master/nba-raptor) containing FiveThirtyEight's RAPTOR statistics for each player (historic and current), and [nba-forecasts](https://github.com/fivethirtyeight/data/tree/master/nba-forecasts) containing game by game elo ratings and forecasts for teams since 1946. All  datasets are formatted as CSVs.

**nba-raptor**

The full calculation of the RAPTOR statistic relies on full player tracking data, which has only been captured since the 2013-14 NBA season. Despite this, the nba-raptor dataset contains historical data back until 1977, by estimating RAPTOR using the highest level of detail available in each era. For consistency, we only consider data from the 2013-14 season onward.

_After filtering in this way, the dataset is quite clean already and ready for visualisation._

**nba-forecasts**

_TODO_

#### _NBA data_

We use the Kaggle dataset [NBA Database](https://www.kaggle.com/datasets/wyattowalsh/basketball) with numerous tables to source most of our NBA data. However, some tables in this dataset are incomplete (such as the `common_player_info` table), and thus to fill in the gaps we scrape the missing parts of the table using the [NBA API](https://github.com/swar/nba_api) (where the Kaggle dataset is also originally sourced from).


> Find a dataset (or multiple) that you will explore. Assess the quality of the data it contains and how much preprocessing / data-cleaning it will require before tackling visualization. We recommend using a standard dataset as this course is not about scraping nor data processing.


### Problematic

> Frame the general topic of your visualization and the main axis that you want to develop.
> - What am I trying to show with my visualization?
> - Think of an overview for the project, your motivation, and the target audience.

### Exploratory Data Analysis

> Pre-processing of the data set you chose
> - Show some basic statistics and get insights about the data

### Related work


> - What others have already done with the data?
> - Why is your approach original?
> - What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).
> - In case you are using a dataset that you have already explored in another context (ML or ADA course, semester project...), you are required to share the report of that work to outline the differences with the submission for this class.

## Milestone 2 (7th May, 5pm)

**10% of the final grade**


## Milestone 3 (4th June, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone
