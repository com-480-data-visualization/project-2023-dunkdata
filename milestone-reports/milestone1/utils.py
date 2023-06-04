import os
import pandas as pd
from tqdm import tqdm

# get all rows of player with player_id
def get_player_rows(raptor_df, player_id):
    return raptor_df[raptor_df['player_id'] == player_id]


# get a list of all teams a player has played for
def get_team_list(raptor_df, player_name):
    team_list = []
    for i in range(len(raptor_df)):
        if raptor_df.iloc[i]['player_name'] == player_name:
            team_list.append(raptor_df.iloc[i][['season', 'season_type', 'team']].to_dict())
    return team_list


def get_player_id_by_name(raptor_df, player_name):
    return raptor_df[raptor_df['player_name'] == player_name]['player_id'].unique()[0]


def check_po_team_count(raptor_df):
    # check if there is any PO season with more than 1 team
    df = raptor_df.groupby(['player_id', 'season', 'season_type'])["team"].count().reset_index()
    return df.loc[(df["team"] > 1) & (df["season_type"] == "PO")]


def sort_teams(raptor_df, player_id):
    """General rules:
    In each season, there is a regular season (RS) and a playoff season (PO).
    In the RS, a player can play for multiple teams.
    In the PO, a player can only play for at most one team.
    We know that teams in all POs are sorted correctly.
    Problems might occur when there is more than one team in the RS.
    """
    player_df = get_player_rows(raptor_df, player_id)
    player_df = sort_teams_rule1(player_df)
    player_df = sort_teams_rule2(player_df)
    # note that if no rules apply, then the order is alphabetical
    return player_df


def check_rule1(season_df):
    """Assert that rule 1 is satisfied"""
    rs_df = season_df[season_df["season_type"] == "RS"]
    po_df = season_df[season_df["season_type"] == "PO"]
    if len(rs_df) <= 1:
        # if there is only one team in the RS season or if player did not play the RS season
        # then the season is sorted correctly
        return True
    if "PO" not in season_df["season_type"].unique():
        # if there is no PO season in the season, then rule 1 is satisfied
        return True
    if rs_df.iloc[-1]["team"] == po_df.iloc[0]["team"]:
        # if the last team in the RS season is the same as the PO team, then the season is sorted correctly
        return True
    return False


def sort_teams_rule1(player_df):
    """Rule 1:
    If there is a PO season in a season, and if the RS season has more than 1 team,
    then one of the teams in the RS season might be the same as the PO team.
    If this is the case, then we swap the rows in the RS season such that the last team in RS matches the PO team.
    """
    all_seasons = player_df["season"].unique()
    season_dfs = []
    for season in all_seasons:
        season_df = player_df[player_df["season"] == season]
        rs_df = season_df[season_df["season_type"] == "RS"]
        po_df = season_df[season_df["season_type"] == "PO"]
        if not check_rule1(season_df):
            po_team = po_df.iloc[0]["team"]
            match_mask = rs_df["team"] == po_team
            rs_team_match = rs_df[match_mask]
            rs_team_no_match = rs_df[~match_mask]
            rs_df = pd.concat([rs_team_no_match, rs_team_match])
        season_df = pd.concat([rs_df, po_df])
        season_dfs.append(season_df)
    player_df = pd.concat(season_dfs)
    return player_df


def sort_teams_rule2(player_df):
    """Rule 2:
    If two consecutive seasons have a common team, then the last team in the first season
    should be the same as the first team in the second season.
    Only check this if rule1 fails.
    """
    all_seasons = player_df["season"].unique()
    # first season is assumed sorted thanks to rule1
    season_dfs = [player_df[player_df["season"] == all_seasons[0]]]
    for i in range(len(all_seasons) - 1):
        season1 = all_seasons[i]
        season2 = all_seasons[i + 1]
        season1_df = player_df[player_df["season"] == season1]
        season2_df = player_df[player_df["season"] == season2]
        season1_last_team = season1_df["team"].values[-1]
        season2_first_team = season2_df["team"].values[0]
        if season1_last_team != season2_first_team:
            # don't do anything if season2_df follows rule 1
            if check_rule1(season2_df):
                season_dfs.append(season2_df)
                continue
            # swap the rows in season2_df such that the last team in season1 matches the first team in season2
            match_mask = season2_df["team"] == season1_last_team
            season2_team_match = season2_df[match_mask]
            season2_team_no_match = season2_df[~match_mask]
            season2_df = pd.concat([season2_team_match, season2_team_no_match])
        season_dfs.append(season2_df)
    player_df = pd.concat(season_dfs)
    return player_df


def check_rs_po_order(player_df):
    """Check if there is a PO season, then it must be the last season in each season"""
    all_seasons = player_df["season"].unique()
    for season in all_seasons:
        season_df = player_df[player_df["season"] == season]
        if "PO" in season_df["season_type"].unique():
            if season_df["season_type"].values[-1] != "PO":
                raise Exception(f"PO season is not the last season in season {season} for player {player_df['player_id'].values[0]}")


def check_season_order(player_df):
    """Verify that the seasons are in chronological order"""
    all_seasons = player_df["season"].unique()
    for i in range(len(all_seasons) - 1):
        season1 = all_seasons[i]
        season2 = all_seasons[i + 1]
        if season1 >= season2:
            raise Exception(f"Season {season1} is not before season {season2} for player {player_df['player_id'].values[0]}")


def get_and_sort_raptor():
    """Get the raptor data and sort it so that the teams (of each player) are in chronological order
    """
    raptor_df_historical = pd.read_csv("datasets/nba-raptor/historical_RAPTOR_by_team.csv")
    raptor_df_latest = pd.read_csv("datasets/nba-raptor/latest_RAPTOR_by_team.csv")
    raptor_df_latest = raptor_df_latest[raptor_df_historical.columns]
    raptor_df = pd.concat([raptor_df_historical, raptor_df_latest])
    # make it so that PO comes after RS
    raptor_df = raptor_df \
        .sort_values(by=['player_id', 'season','season_type'], ascending=[1,1,0]) \
        .groupby(['player_id', 'season']) \
        .head(5) # max number of teams a player can play for in a season

    player_ids = raptor_df["player_id"].unique()
    player_dfs = []
    for player_id in tqdm(player_ids):
        try:
            player_df = sort_teams(raptor_df, player_id)
            check_rs_po_order(player_df)
            check_season_order(player_df)
            player_dfs.append(player_df)
        except Exception as e:
            print(player_id)
            print(e)
    player_dfs = pd.concat(player_dfs)
    player_dfs.to_csv("datasets/nba-raptor/historical_latest_RAPTOR_by_team.csv", index=False)
    return player_dfs


# teams_df = pd.read_csv("csv/team.csv")
# # Define a dictionary mapping state names to abbreviations
# state_abbr = {'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
#               'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
#               'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
#               'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
#               'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
#               'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH',
#               'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
#               'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA',
#               'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN',
#               'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
#               'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC', 'Ontario': 'ON'}
# # Get the abbreviation for a state name
# teams_df["state_abbrv"] = teams_df.apply(lambda row: state_abbr[row["state"]], axis=1)
# teams_df["location"] = teams_df["city"] + ", " + teams_df["state_abbrv"]
