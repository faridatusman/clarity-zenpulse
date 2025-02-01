;; ZenPulse Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-not-found (err u404))
(define-constant err-unauthorized (err u401))

;; Data Variables
(define-map user-profiles
  principal
  {
    name: (string-utf8 50),
    total-sessions: uint,
    total-minutes: uint,
    streak: uint,
    last-session: uint
  }
)

(define-map meditation-sessions
  uint
  {
    user: principal,
    duration: uint,
    mood-before: (string-utf8 20),
    mood-after: (string-utf8 20),
    timestamp: uint
  }
)

(define-data-var session-counter uint u0)

;; Public Functions
(define-public (create-profile (name (string-utf8 50)))
  (ok (map-set user-profiles tx-sender {
    name: name,
    total-sessions: u0,
    total-minutes: u0,
    streak: u0,
    last-session: u0
  }))
)

(define-public (log-session (duration uint) (mood-before (string-utf8 20)) (mood-after (string-utf8 20)))
  (let
    (
      (session-id (+ (var-get session-counter) u1))
      (current-time block-height)
    )
    (begin
      (var-set session-counter session-id)
      (map-set meditation-sessions session-id {
        user: tx-sender,
        duration: duration,
        mood-before: mood-before,
        mood-after: mood-after,
        timestamp: current-time
      })
      (update-user-stats duration current-time)
      (ok session-id)
    )
  )
)

;; Private Functions
(define-private (update-user-stats (duration uint) (timestamp uint))
  (let
    (
      (user-data (unwrap! (map-get? user-profiles tx-sender) err-not-found))
      (new-total-sessions (+ (get total-sessions user-data) u1))
      (new-total-minutes (+ (get total-minutes user-data) duration))
      (new-streak (calculate-streak (get last-session user-data) timestamp (get streak user-data)))
    )
    (ok (map-set user-profiles tx-sender
      {
        name: (get name user-data),
        total-sessions: new-total-sessions,
        total-minutes: new-total-minutes,
        streak: new-streak,
        last-session: timestamp
      }
    ))
  )
)

(define-private (calculate-streak (last-session uint) (current-time uint) (current-streak uint))
  (if (is-consecutive last-session current-time)
    (+ current-streak u1)
    u1
  )
)

;; Read Only Functions
(define-read-only (get-profile (user principal))
  (map-get? user-profiles user)
)

(define-read-only (get-session (session-id uint))
  (map-get? meditation-sessions session-id)
)

(define-read-only (is-consecutive (last-session uint) (current-time uint))
  (< (- current-time last-session) u144)
)
