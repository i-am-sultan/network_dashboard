from flask import Flask, render_template, request, redirect, url_for, jsonify
import logging
import os
import pandas as pd
app = Flask(__name__)

# Configure backend logging
if not os.path.exists('logs'):
    os.makedirs('logs')

logging.basicConfig(filename='logs/app.log', level=logging.INFO,
                    format='%(asctime)s %(levelname)s: %(message)s')

# Hardcoded credentials for now
VALID_USERNAME = 'admin'
VALID_PASSWORD = 'password'

@app.route('/')
def login():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/authenticate', methods=['POST'])
def authenticate():
    username = request.form['username']
    password = request.form['password']

    if username == VALID_USERNAME and password == VALID_PASSWORD:
        logging.info(f"Successful login attempt by user: {username}")
        return redirect(url_for('dashboard'))
    else:
        logging.warning(f"Failed login attempt by user: {username}")
        return render_template('index.html', error="Invalid credentials!")


@app.route('/get_logs', methods=['GET'])
def get_logs():
    try:
        # Read CSV file with parsed datetime columns
        df = pd.read_csv('data/data.csv', parse_dates=['Downtime', 'Uptime'], dayfirst=True)
        logging.info(f"Parsed DataFrame: \n{df}")

        # Get filter params
        isp_filter = request.args.get('isp')
        time_filter = request.args.get('timeframe')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Apply ISP filter
        if isp_filter and isp_filter != 'All':
            df = df[df['ISP'] == isp_filter]

        # Apply Timeframe filter (based on Downtime)
        today = pd.Timestamp.now()

        if time_filter == 'Today':
            df = df[df['Downtime'].dt.date == today.date()]

        elif time_filter == 'ThisWeek':
            df = df[df['Downtime'].dt.isocalendar().week == today.isocalendar().week]

        elif time_filter == 'ThisMonth':
            df = df[df['Downtime'].dt.month == today.month]

        elif time_filter == 'ThisYear':
            df = df[df['Downtime'].dt.year == today.year]

        elif time_filter == 'Custom' and start_date and end_date:
            start_date_parsed = pd.to_datetime(start_date)
            end_date_parsed = pd.to_datetime(end_date)
            df = df[(df['Downtime'] >= start_date_parsed) & (df['Downtime'] <= end_date_parsed)]

        # Calculate 'Difference' in hours
        df['DifferenceHours'] = (df['Uptime'] - df['Downtime']).dt.total_seconds() / 3600.0
        logging.info(f"Calculated Difference (hours):\n{df[['ISP', 'Downtime', 'Uptime', 'DifferenceHours']]}")

        # Stats Calculations
        total_downtime_hours = df['DifferenceHours'].sum()
        total_uptime_hours = (24.0 * len(df)) - total_downtime_hours
        total_hours = total_uptime_hours + total_downtime_hours

        availability_percentage = (total_uptime_hours / total_hours) * 100 if total_hours > 0 else 0
        outage_count = (df['DifferenceHours'] == 24.0).sum()

        logging.info(f"Total Uptime: {total_uptime_hours:.2f} hrs, "
                     f"Total Downtime: {total_downtime_hours:.2f} hrs, "
                     f"Availability: {availability_percentage:.2f} %, "
                     f"Outages: {outage_count}")

        # Prepare Trend Data
        df['Date'] = df['Downtime'].dt.date  # extract date part
        trend_group = df.groupby('Date').agg({
            'DifferenceHours': 'sum'
        }).rename(columns={'DifferenceHours': 'TotalDowntime'})

        # Add Uptime (24*entries - downtime) per day
        trend_group['TotalUptime'] = (24.0 * df.groupby('Date').size()) - trend_group['TotalDowntime']

        labels = [d.strftime('%d-%b') for d in trend_group.index]
        downtime_values = trend_group['TotalDowntime'].round(2).tolist()
        uptime_values = trend_group['TotalUptime'].round(2).tolist()

        logging.info(f"Trend Data:\n{trend_group}")

        # Format datetime columns
        df['Downtime'] = df['Downtime'].dt.strftime('%Y-%m-%d %H:%M:%S')
        df['Uptime'] = df['Uptime'].dt.strftime('%Y-%m-%d %H:%M:%S')
        df['Difference'] = df['DifferenceHours'].astype(str) + " hours"

        # Prepare response
        data = {
            'logs': df[['ISP', 'Downtime', 'Uptime', 'Difference']].to_dict(orient='records'),
            'stats': {
                'totalUptime': round(total_uptime_hours, 2),
                'totalDowntime': round(total_downtime_hours, 2),
                'availability': round(availability_percentage, 2),
                'outages': int(outage_count)
            },
            'trendData': {
                'labels': labels,
                'uptime': uptime_values,
                'downtime': downtime_values
            }
        }

        logging.info(f"Returning {len(df)} filtered logs with stats and trend data to client.")
        return jsonify(data)

    except Exception as e:
        logging.error(f"Error while filtering logs: {e}")
        return jsonify({"error": "Failed to process log data."}), 500


if __name__ == '__main__':
    app.run(debug=True)
