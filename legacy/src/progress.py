# !/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on: Sun 05 Dec 2021 19:16:32
Description: Performance statistics

@author: tsenoner
"""
import matplotlib.pyplot as plt

from db_api import Database


def show_progress(db: Database):
    querry = "SELECT time, correct FROM dates"
    data = db.get_data(querry)

    # structured_data = {date: [nr_wrong, nr_correct]}
    structured_data = {}
    for time, correct in data:
        date = time.date()
        if correct:
            structured_data.setdefault(date, [0, 0])[1] += 1
        else:
            structured_data.setdefault(date, [0, 0])[0] += 1

    # structured_data[datetime.date(2021, 12, 9)] = [5, 4]
    # structured_data[datetime.date(2021, 12, 7)] = [7, 4]
    # print(type(list(structured_data.keys())[0]))
    # tmp = sorted(structured_data.keys())[-10:]
    # print(tmp)

    x_val = [date.strftime("%d-%m") for date in structured_data.keys()]
    x_val_idx = list(range(len(x_val)))
    wrong, correct = list(zip(*structured_data.values()))

    width = 0.35

    fig = plt.figure(figsize=(4.75, 1.75), dpi=75)
    ax = fig.add_subplot(111)

    ax.bar(x_val_idx, correct,
           width=width, color="#20913e", label="correct"
           )
    ax.bar([idx+width for idx in x_val_idx], wrong,
           width=width, color="#a61f2b", label="wrong"
           )

    ax.set_xticks([idx + width/2 for idx in x_val_idx])
    ax.set_xticklabels(x_val)
    ax.legend()

    plt.savefig("img/stat.png", bbox_inches='tight')
    # plt.show()


def main():
    with Database(db_name="log") as db:
        show_progress(db)


if __name__ == "__main__":
    main()
