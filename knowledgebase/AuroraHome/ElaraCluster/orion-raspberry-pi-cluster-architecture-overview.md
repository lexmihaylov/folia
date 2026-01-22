# Orion Raspberry Pi Cluster – Architecture Overview

## 1. Purpose

The Orion cluster is a small, self-hosted Raspberry Pi cluster designed to provide:

- Media serving
- Network storage
- Monitoring and observability
- Internal documentation
- Web-based administration tools

The primary design goals are:

- Stability over performance
- Clear separation of responsibilities
- Minimal moving parts
- Easy recovery and troubleshooting
- Low power consumption

---

## 2. High-Level Architecture

The cluster is composed of multiple Raspberry Pi nodes, each assigned a **single, well-defined role**.

Key principles:
- One responsibility per node where possible
- Storage isolated from compute-heavy workloads
- Monitoring and control separated from user-facing services
- Flat, understandable network topology

---

## 3. Nodes and Roles

### elara-prime (Control Plane)

**Role:** Monitoring, control, and internal services  
**Characteristics:** Low IO, predictable load, always-on

Services:
- Prometheus (metrics collection)
- Grafana (visualization and dashboards)
- Nginx (reverse proxy for internal services)
- Folia (Markdown documentation / notes)

Responsibilities:
- Observability for the entire cluster
- Internal dashboards and status views
- Documentation explaining how the cluster works
- No media serving or heavy disk IO

This node is intended to remain stable and responsive at all times, even when other nodes are under load.

---

### elara-node-1 (Media Node)

**Role:** Media serving  
**Characteristics:** CPU and network burst load

Services:
- Jellyfin (media server)

Responsibilities:
- Serving media to clients
- Library scanning and metadata management
- Direct play and lightweight transcoding (when possible)

This node is isolated from storage IO and monitoring workloads to avoid contention.

---

### elara-node-2 (Storage and Automation Node)

**Role:** Storage and download automation  
**Characteristics:** Disk IO heavy, network heavy

Services:
- Samba (SMB file sharing)
- qBittorrent (torrent client)
- Sonarr (TV automation)
- Jackett (indexer integration)

Storage:
- USB HDD mounted locally
- Exported over SMB to other nodes

Responsibilities:
- Owning physical storage
- Handling downloads and file organization
- Serving shared directories to the cluster

This node is intentionally noisy and isolated so that IO spikes do not affect other services.

---

### Edge / Auxiliary Nodes (if present)

**Role:** Specialized or experimental tasks  
Examples:
- Network monitoring
- Packet capture
- Lightweight services
- Testing new software

These nodes are non-critical and can be removed or repurposed without impacting the core cluster.

---

## 4. Storage Architecture

### Physical Storage
- A USB HDD is attached directly to elara-node-2
- The disk is mounted locally (e.g. `/mnt/usbdrive`)

### Logical Layout
Example structure:

/mnt/usbdrive/
- |----- media/
- |___|----- Movies/
- |___|----- TV/
- |___|----- Music/
- |---- archives/


### Network Sharing
- Samba is used for network file access
- Modern SMB dialects (SMB 3.x) are preferred
- Each share maps to a dedicated directory

Shares:
- `media` → media services
- `archives` → long-term storage and backups

---

## 5. Users and Permissions

Service accounts are used instead of human users.

### media
- Purpose: media services
- No shell
- No home directory
- Samba access to the `media` share only

### archivist
- Purpose: archive and backup access
- No shell
- No home directory
- Samba access to the `archives` share only

Principles:
- Least privilege
- No interactive logins
- No SSH access for service users

---

## 6. Networking

- All nodes reside on the same LAN
- Static hostnames are used
- Internal DNS rewrites provided by AdGuard Home

**Domains:**

| Domain | IP Address | Node |
| - | - | - |
| http://adguard.lan | IP Address | elara-node-2.lan |

Nginx acts as the single entry point for web-based services.

---

## 7. Monitoring and Observability

### Metrics
- Prometheus scrapes metrics from all nodes
- node_exporter runs on each node

Collected metrics include:
- CPU usage and frequency
- Memory usage
- Disk usage and IO
- Network throughput
- Temperature
- Undervoltage and throttling flags

### Visualization
- Grafana dashboards
- Desktop and mobile-friendly views
- Real-time and historical analysis

Monitoring is considered a first-class feature, not an afterthought.

---

## 8. Documentation

Documentation is treated as part of the infrastructure.

### Tool
- Folia
- Markdown-based
- Flat-file storage
- No database

### Purpose
- Architecture explanation
- Runbooks
- Recovery procedures
- Notes on decisions and trade-offs

Documentation is hosted on elara-prime and stored on local disk.

---

## 9. Design Philosophy Summary

- Prefer boring, stable solutions
- Avoid unnecessary complexity
- Isolate failure domains
- Measure before optimizing
- Documentation is infrastructure
- Reliability is more valuable than raw performance

---

## 10. Future Expansion

Planned or possible improvements:
- Additional nodes for service isolation
- Backup automation
- Read-only replicas for archives
- Alerting based on monitoring data
- Hardware upgrades as older nodes are retired

The architecture is intentionally flexible and incremental.

---

## 11. Final Notes

This cluster is designed to be understandable months or years later.

If something breaks:
- Monitoring should explain what happened
- Documentation should explain how to fix it
- No single failure should take everything down
