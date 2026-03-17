#!/bin/bash
set -e

awx-manage check_instance_ready --skip-checks >/dev/null 2>&1
