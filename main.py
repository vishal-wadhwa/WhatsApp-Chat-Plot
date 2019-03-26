import sys
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import datetime as dtm
# from scipy.interpolate import spline
# from scipy.interpolate import interp1d
# import numpy as np


def extract_data(filename):
    timely_data = {}
    f = open(filename)
    for line in f:
        spl = line.strip().split('-')
        if len(spl) <= 1:
            continue

        datestr = spl[0].strip().split(',')[0]
        date_dmy = datestr.split('/')

        if len(date_dmy) < 3:
            continue

        date = date_dmy[1]+'/'+date_dmy[2]

        if ':' in spl[1]:
            person = spl[1].split(':')[0]

            if person not in timely_data:
                timely_data[person] = {}

            if date not in timely_data[person]:
                timely_data[person][date] = 0

            timely_data[person][date] += 1
    f.close()
    return timely_data


def plot(filename, data):
    plt.xlabel('Months')
    plt.ylabel('Messages')
    plt.title(filename)
    plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%b %y'))
    plt.gca().xaxis.set_major_locator(mdates.MonthLocator())
    plt.gca().xaxis.set_minor_locator(mdates.DayLocator())
    plt.minorticks_on()
    orig_size = plt.gcf().get_size_inches()
    plt.gcf().set_size_inches(orig_size[0]*1.5, orig_size[1])

    fn = filename.split('.')
    fn.pop()
    fn.append('png')
    fn = '.'.join(fn)

    for name in data.keys():
        dv = []
        dts = []
        vals = []
        for dt, val in data[name].items():
            dv.append((dtm.datetime.strptime(dt, '%m/%y').date(), val))

        dv.sort()
        for a, b in dv:
            dts.append(a)
            vals.append(b)

        # dts = mdates.date2num(dts)
        # xv = np.linspace(min(dts), max(dts), max(300, len(dts)))
        # yv = spline(dts, vals, xv)
        # yv = interp1d(dts, vals, kind='cubic')(xv)
        plt.plot(dts, vals, '-.', label=name)

    plt.gcf().autofmt_xdate(rotation=45)
    plt.gcf().tight_layout()
    plt.legend()
    plt.savefig(fn)


def main():
    if len(sys.argv) <= 1:
        sys.exit("Chat file not supplied.")

    data = extract_data(sys.argv[1])
    plot(sys.argv[1], data)


if __name__ == '__main__':
    main()
