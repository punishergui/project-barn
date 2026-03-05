from app.cli.seed import seed_dev_command


def init_app(app):
    app.cli.add_command(seed_dev_command)
