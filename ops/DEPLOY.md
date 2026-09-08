# Deploy the AFTERIMAGE agent daemon to the VPS

Same shape as the Muse Mirror capsule worker: a pure-Node loop under systemd that
drives the deployed app's `/api/agent/tick` and logs to journald. The daemon is
**propose-only** — it reads owner-ready proposals and submits nothing.

Prereqs: the AFTERIMAGE Next app is deployed and reachable at some origin (Vercel,
or `pnpm start` on the box). Node 18+ on the VPS (`/usr/bin/node`).

## 1. Put the code on the box

```sh
sudo mkdir -p /opt/afterimage
# from your workstation, in the repo root:
rsync -az --delete --exclude node_modules --exclude .next --exclude .git ./ root@YOUR_VPS:/opt/afterimage/
```

The worker (`ops/afterimage-agent-worker.mjs`) has zero runtime deps — no
`pnpm install` is needed on the VPS just to run the daemon.

## 2. Environment file

```sh
sudo mkdir -p /etc/afterimage
sudo cp /opt/afterimage/ops/afterimage-agent.env.example /etc/afterimage/agent.env
sudo chmod 600 /etc/afterimage/agent.env
sudoedit /etc/afterimage/agent.env       # set AFTERIMAGE_APP_ORIGIN + AFTERIMAGE_AGENT_WORKER_SECRET
```

Set the **same** `AFTERIMAGE_AGENT_WORKER_SECRET` in the deployed app's env so the
endpoint only answers this worker.

## 3. Install + start the service

```sh
sudo cp /opt/afterimage/ops/systemd/afterimage-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now afterimage-agent
```

## 4. Verify

```sh
systemctl status afterimage-agent --no-pager
journalctl -u afterimage-agent -f          # watch cycles + owner-ready proposals stream in
```

You should see one `cycle_… source=live … proposals=N submitted=false` line per
interval, then one `▸` line per proposal with its reversal plan and approve hash.

## Update / stop

```sh
# after rsync-ing new code:
sudo systemctl restart afterimage-agent
sudo systemctl stop afterimage-agent       # halt the daemon
```

## What it will and won't do

- **Will:** every interval, read the live market, surface its own alphas, plan
  them against real filters, attach a reversibility plan, and log owner-ready
  proposals.
- **Won't:** place, approve, or submit any order; move funds; or touch
  irreversible capabilities. Turning a proposal into a fill is an owner action —
  approve the exact payload hash and let the owner's authenticated Agent OS client
  execute it (`AFTERIMAGE_MCP_*`, see `.env.example`).
