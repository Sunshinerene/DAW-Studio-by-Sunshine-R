# ---------- Hintergrund-Takt für die DAW (Worker statt gedrosseltem Timer) ----------
h=once(h,"this.timerId = setInterval(() => this.schedulerLoop(), 22);","this.timerId = window.WorkerTick ? WorkerTick.start(() => this.schedulerLoop(), 22) : setInterval(() => this.schedulerLoop(), 22);",'bg-start')
h=once(h,"clearInterval(this.timerId);","if (window.WorkerTick) WorkerTick.stop(this.timerId); else clearInterval(this.timerId);",'bg-stop')
h=once(h,"const lookaheadSec = 0.11;","const lookaheadSec = document.hidden ? 0.6 : 0.11;",'bg-look')
