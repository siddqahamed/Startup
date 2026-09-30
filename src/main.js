import './style.css'
import { createIcons, LayoutDashboard, MapPinned, UsersRound, CalendarCheck, LogOut, Bell, Compass, MessageCircle, CalendarClock, WalletCards, TrendingUp, ArrowRight, Sparkles, Pencil, Trash2, ArrowUpRight, Ellipsis, X, BadgeCheck, Luggage } from 'lucide'

const defaultPlaces = [
  { name: 'Ooty', area: 'Nilgiris', type: 'Hill station', status: 'Live', image: '/images/otty.jpg', description: 'Tea gardens, misty mornings and slow mountain days.' },
  { name: 'Wayanad', area: 'Kerala', type: 'Forest escape', status: 'Live', image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=900&q=85', description: 'Rainforest trails, waterfalls and quiet stays.' },
  { name: 'Mysuru', area: 'Karnataka', type: 'Heritage city', status: 'Live', image: 'https://images.unsplash.com/photo-1600100397608-f010a3c50eaf?auto=format&fit=crop&w=900&q=85', description: 'Palaces, markets and a generous taste of history.' },
  { name: 'Chikkamagaluru', area: 'Karnataka', type: 'Coffee country', status: 'Live', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85', description: 'Cloud-kissed peaks and fresh coffee estates.' },
  { name: 'Coorg', area: 'Karnataka', type: 'Rainy retreat', status: 'Draft', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85', description: 'Homestays, spice gardens and monsoon calm.' },
  { name: 'Gokarna', area: 'Karnataka', type: 'Coastal escape', status: 'Draft', image: 'https://images.unsplash.com/photo-1507529910107-8f1f4f4d3c4c?auto=format&fit=crop&w=900&q=85', description: 'Quiet beaches for a softer kind of weekend.' },
]
const storedPlaces = JSON.parse(localStorage.getItem('wenders-places') || 'null')
let places = storedPlaces?.some((place) => place.type === 'Hill station' || place.type === 'Forest escape') ? storedPlaces : defaultPlaces
const customers = [
  { name: 'Ananya Rao', email: 'ananya.rao@email.com', project: 'Ooty weekend', location: 'Bengaluru', date: '18 Sep 2026', status: 'New' },
  { name: 'Rohan Mehta', email: 'rohan.mehta@email.com', project: 'Wayanad escape', location: 'Indiranagar', date: '16 Sep 2026', status: 'In progress' },
  { name: 'Meera Krishnan', email: 'meera.k@email.com', project: 'Mysuru heritage tour', location: 'Jayanagar', date: '12 Sep 2026', status: 'Proposal sent' },
  { name: 'Arjun Shah', email: 'arjun.shah@email.com', project: 'Chikkamagaluru stay', location: 'Koramangala', date: '08 Sep 2026', status: 'Closed' },
]
let bookings = JSON.parse(localStorage.getItem('wenders-bookings') || '[]')
const app = document.querySelector('#app')
let serverReady = false
let bookingPoll
let customerPoll
let customerAccount = null
let knownBookingCount = bookings.length
let bookingSnapshot = JSON.stringify(bookings)
const savePlaces = () => localStorage.setItem('wenders-places', JSON.stringify(places))
const saveBookings = () => localStorage.setItem('wenders-bookings', JSON.stringify(bookings))
const apiRequest = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(result.error || `API ${response.status}`); error.status = response.status; throw error }
  return result
}
const syncServerData = async () => { try { const [serverPlaces, serverBookings] = await Promise.all([apiRequest('/places'), apiRequest('/bookings')]); places = serverPlaces.map((place) => ({ name: place.name, area: place.area, type: place.type, status: place.status, image: place.image_url, description: place.description })); bookings = serverBookings; savePlaces(); saveBookings(); serverReady = true; renderAdmin() } catch { serverReady = false } }
const startBookingPolling = () => { clearInterval(bookingPoll); bookingPoll = setInterval(async () => { if (!serverReady) return; try { const latestBookings = await apiRequest('/bookings'); const latestSnapshot = JSON.stringify(latestBookings); if (latestSnapshot !== bookingSnapshot) { bookings = latestBookings; bookingSnapshot = latestSnapshot; knownBookingCount = bookings.length; saveBookings(); renderAdmin() } } catch {} }, 5000) }
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
const safeImage = (value) => escapeHtml(value).replace(/'/g, '%27')

function updateBookingJourney(booking) {
  const section = document.querySelector('#booking-status')
  if (!section || !booking) return
  section.querySelector('.booking-status-label').textContent = `${booking.destination} · ${booking.status}`
  section.classList.add('is-visible')
  const stageByStatus = { New: 0, Planning: 1, Confirmed: 2, Completed: 3, Cancelled: -1 }
  const currentStage = stageByStatus[booking.status] ?? 0
  section.querySelectorAll('.booking-step').forEach((step, index) => {
    step.classList.toggle('active', index === currentStage)
    step.classList.toggle('is-complete', currentStage >= 0 && index < currentStage)
    step.classList.toggle('is-current', index === currentStage)
  })
}

function renderCustomerBookings(customerBookings) {
  const list = document.querySelector('#account-bookings')
  if (!list) return
  if (!customerBookings.length) {
    list.innerHTML = '<div class="account-empty"><h2>No trips yet</h2><p>When you book an escape, its itinerary and status will appear here.</p><a class="button button-dark" href="#top">Plan a trip</a></div>'
    return
  }
  list.innerHTML = customerBookings.map((booking) => {
    const statusClass = booking.status.toLowerCase().replace(/\s+/g, '-')
    return `<article class="account-trip"><header><div><p class="eyebrow">${escapeHtml(booking.destination)}</p><h2>${escapeHtml(booking.destination)} escape</h2></div><span class="customer-status ${statusClass}">${escapeHtml(booking.status)}</span></header><div class="account-trip-details"><p><small>Dates</small><strong>${escapeHtml(booking.arrival)} to ${escapeHtml(booking.departure)}</strong></p><p><small>Travellers</small><strong>${escapeHtml(booking.travellers)}</strong></p><p><small>Last updated</small><strong>${escapeHtml(booking.updatedAt || booking.createdAt)}</strong></p></div><p class="account-trip-update">${escapeHtml(bookingStatusMessage(booking.status))}</p></article>`
  }).join('')
}

function bookingStatusMessage(status) {
  return ({ New: 'Your request is in our travel team’s inbox.', Planning: 'We are shaping your route and stay.', Confirmed: 'Your trip is confirmed. Keep an eye out for your final itinerary.', Completed: 'We hope you had a wonderful trip.', Cancelled: 'This booking has been cancelled. Contact us if you need help.' })[status] || 'Your trip status is up to date.'
}

function renderSite() {
  app.innerHTML = `<header class="site-header"><a class="brand" href="#top"><span>W</span> WendersBengaluru</a><nav class="desktop-nav" aria-label="Main navigation"><a href="#destinations">Destinations</a><a href="#experiences">Experiences</a><a href="#contact">Plan a trip</a></nav><a class="header-cta" href="#login">Admin sign in <span aria-hidden="true">↗</span></a></header><main id="top"><section class="hero section-pad"><div class="hero-copy reveal"><p class="eyebrow"><span></span> South India · Curated travel</p><h1>Go where the <em>green</em> begins.</h1><p class="hero-intro">Thoughtful escapes, slow stays and wild corners of the South, planned around how you want to feel.</p><a class="button button-dark" href="#destinations">Explore destinations <span>↘</span></a></div><div class="hero-art reveal" aria-label="Misty mountain landscape in South India"><div class="art-note">01 <span>Nilgiris, Ooty</span></div></div><div class="hero-foot"><span>Handpicked routes</span><span>Nature · Culture · Rest</span><span>Scroll to explore ↓</span></div></section><section id="experiences" class="statement section-pad"><p class="eyebrow">Travel slowly</p><div class="statement-grid"><h2>The best trips leave room for <em>discovery.</em></h2><p>From a sunrise above the Western Ghats to an evening market in Mysuru, we help you find the places that make a weekend feel longer. No crowded checklists. Just good roads, local stays and time well spent.</p></div></section><section id="destinations" class="services section-pad"><div class="section-heading"><p class="eyebrow">Where to next</p><p class="section-index">01 / 06</p></div><div class="destination-grid">${places.filter((place) => place.status === 'Live').slice(0, 4).map((place) => `<article class="destination-card"><div class="destination-image" style="background-image:url('${safeImage(place.image)}')"><span>${escapeHtml(place.type)}</span></div><div class="destination-info"><h3>${escapeHtml(place.name)}</h3><p>${escapeHtml(place.description || 'A beautiful South Indian escape.')}</p><a href="#contact" aria-label="Plan a trip to ${escapeHtml(place.name)}">Plan this escape ↗</a></div></article>`).join('')}</div></section><section id="contact" class="contact section-pad"><div><p class="eyebrow">Start wandering</p><h2>Where will you<br>go next?</h2><p class="contact-copy">Tell us your dates, your mood and how far you want to wander. We’ll shape a route around it.</p></div><form id="project-form"><label>Name<input name="name" required placeholder="Your name"></label><label>Email<input name="email" type="email" required placeholder="you@email.com"></label><label>Dream destination<textarea name="message" rows="3" required placeholder="Ooty, Wayanad, somewhere new..."></textarea></label><button class="button button-light" type="submit">Plan my escape <span>↗</span></button><p class="form-status" role="status"></p></form></section></main><footer><a class="brand" href="#top"><span>W</span> WendersBengaluru</a><p>Made for wandering well.</p><a href="#login">Admin sign in</a></footer>`
  document.querySelector('.header-cta').insertAdjacentHTML('beforebegin', '<a class="customer-nav-link" href="#account">My trips</a>')
  document.querySelector('#project-form').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.target); const message = `Hello WendersBengaluru, I am ${data.get('name')} (${data.get('email')}). I am interested in planning: ${data.get('message')}`; const status = document.querySelector('.form-status'); status.textContent = 'Opening WhatsApp so we can help plan your trip.'; window.open(`https://wa.me/917483077805?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer'); event.target.reset() })
  document.querySelector('.desktop-nav a:last-child').href = '#booking'
  document.querySelector('.desktop-nav a:last-child').textContent = 'Book a trip'
  document.querySelector('#destinations').insertAdjacentHTML('beforebegin', `<section id="booking" class="booking-section section-pad"><div class="booking-intro"><p class="eyebrow">Your next chapter</p><h2>Plan a trip<br>that feels <em>easy.</em></h2><p>Choose a place, pick your dates and leave the details to us.</p></div><form id="booking-form" class="booking-form"><label>Destination<select name="destination" required>${places.filter((place) => place.status === 'Live').map((place) => `<option>${escapeHtml(place.name)}</option>`).join('')}</select></label><div class="date-row"><label>Arrival<input type="date" name="arrival" required></label><label>Departure<input type="date" name="departure" required></label></div><label>Travellers<select name="travellers"><option>1 traveller</option><option>2 travellers</option><option>3 travellers</option><option>4+ travellers</option></select></label><button class="button button-light" type="submit">Check availability <span>↗</span></button><p class="booking-status" role="status"></p></form></section>`)
  document.querySelector('.booking-intro').insertAdjacentHTML('beforeend', '<p class="booking-account-note">Sign in or create a traveller account to save your request and follow every update. <a href="#account">My trips</a></p>')
  document.querySelectorAll('.destination-info a').forEach((link) => { link.href = '#booking' })
  const today = new Date().toISOString().split('T')[0]
  document.querySelectorAll('#booking-form input[type="date"]').forEach((input) => { input.min = today })
  document.querySelector('#booking-form').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.target); const status = document.querySelector('.booking-status'); status.textContent = `${data.get('destination')} is available for your dates. We will send a route proposal shortly.` })
const dashboardIcons = { LayoutDashboard, MapPinned, UsersRound, CalendarCheck, LogOut, Bell, Compass, MessageCircle, CalendarClock, WalletCards, TrendingUp, ArrowRight, Sparkles, Pencil, Trash2, ArrowUpRight, Ellipsis, X, BadgeCheck, Luggage }
  document.querySelector('#booking').insertAdjacentHTML('afterend', '<section id="booking-status" class="booking-status-section section-pad" aria-live="polite"><div class="booking-status-heading"><div><p class="eyebrow">Your booking journey</p><h2>Simple steps, clear updates.</h2></div><span class="booking-status-label">No active booking</span></div><div class="booking-progress"><div class="booking-step active"><span>01</span><strong>Request received</strong><small>We have your trip details</small></div><div class="booking-step"><span>02</span><strong>Planning</strong><small>Our team shapes your route</small></div><div class="booking-step"><span>03</span><strong>Confirmed</strong><small>Your dates are reserved</small></div><div class="booking-step"><span>04</span><strong>Ready to travel</strong><small>Final details are shared</small></div></div></section>')
  const travelStages = [
    ['calendar-check', 'Request received', 'Your dates and destination are with us'],
    ['map-pinned', 'Itinerary planning', 'Your route and stays are taking shape'],
    ['badge-check', 'Trip confirmed', 'Your dates and stay are secured'],
    ['luggage', 'Ready to travel', 'Your final itinerary is ready'],
  ]
  document.querySelectorAll('#booking-status .booking-step').forEach((step, index) => {
    const [icon, title, detail] = travelStages[index]
    step.prepend(iconPlaceholder(icon))
    step.querySelector('strong').textContent = title
    step.querySelector('small').textContent = detail
  })
  createIcons({ icons: dashboardIcons, attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true' } })
  document.querySelectorAll('#booking-status .booking-step svg.lucide').forEach((icon) => icon.classList.add('ui-icon'))
  const bookingForm = document.querySelector('#booking-form')
  bookingForm.querySelectorAll('.date-row label').forEach((label) => {
    const labelText = label.firstChild
    const caption = document.createElement('span')
    caption.className = 'date-field-label'
    caption.append(iconPlaceholder('calendar-check'), document.createTextNode(labelText.textContent.trim()))
    label.replaceChild(caption, labelText)
  })
  createIcons({ icons: dashboardIcons, attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true' } })
  bookingForm.querySelectorAll('.date-field-label svg.lucide').forEach((icon) => icon.classList.add('ui-icon'))
  bookingForm.insertAdjacentHTML('afterbegin', '<label>Your name<input name="customerName" required placeholder="Full name"></label><label>Email<input name="customerEmail" type="email" required placeholder="you@email.com"></label><label>WhatsApp number<input name="customerPhone" required placeholder="+91 98765 43210"></label>')
  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    const form = event.currentTarget
    const data = new FormData(form)
    const booking = { name: data.get('customerName'), email: data.get('customerEmail'), phone: data.get('customerPhone'), destination: data.get('destination'), arrival: data.get('arrival'), departure: data.get('departure'), travellers: data.get('travellers') }
    const status = document.querySelector('.booking-status')
    try {
      await apiRequest('/bookings', { method: 'POST', body: JSON.stringify(booking) })
      sessionStorage.removeItem('wenders-pending-booking')
      updateBookingJourney({ ...booking, status: 'New' })
      status.textContent = 'Request received. Follow your trip updates in My trips.'
      form.reset()
      refreshCustomerData()
    } catch (error) {
      status.textContent = error.message
    }
  }, true)
  app.insertAdjacentHTML('beforeend', '<a class="whatsapp-button" href="https://wa.me/917483077805?text=Hello%20WendersBengaluru%2C%20I%20would%20like%20help%20planning%20a%20trip." target="_blank" rel="noreferrer" aria-label="Chat with WendersBengaluru on WhatsApp"><span class="whatsapp-icon" aria-hidden="true">WA</span><b>Plan on WhatsApp</b><i aria-hidden="true">↗</i></a>')
}

function renderCustomerAuth(register = false, message = '') {
  let pendingBooking = null
  try { pendingBooking = JSON.parse(sessionStorage.getItem('wenders-pending-booking') || 'null') } catch {}
  app.innerHTML = `<main class="customer-shell auth-shell"><a class="brand auth-brand" href="#top"><span>W</span> WendersBengaluru</a><section class="customer-auth-panel auth-panel"><a class="back-link" href="#top">← Back to website</a><p class="eyebrow">Traveller account</p><h1>${register ? 'Create your<br><em>account.</em>' : 'Welcome<br><em>back.</em>'}</h1><p class="auth-copy">${register ? 'Save your trips and follow every update from request to departure.' : 'Sign in to view your bookings and live trip updates.'}</p><form id="customer-auth-form" class="auth-form">${register ? `<label>Full name<input name="name" required autocomplete="name" value="${escapeHtml(pendingBooking?.customerName || '')}"></label><label>WhatsApp number<input name="phone" required autocomplete="tel" value="${escapeHtml(pendingBooking?.customerPhone || '')}"></label>` : ''}<label>Email address<input type="email" name="email" required autocomplete="email" value="${escapeHtml(pendingBooking?.customerEmail || '')}"></label><label>Password<input type="password" name="password" required minlength="8" autocomplete="${register ? 'new-password' : 'current-password'}"></label><button class="button button-dark" type="submit">${register ? 'Create account' : 'Sign in to My trips'}</button><p class="form-status customer-auth-status" role="status">${escapeHtml(message)}</p></form><p class="customer-auth-switch">${register ? 'Already have an account?' : 'New to WendersBengaluru?'} <a href="${register ? '#account' : '#account-register'}">${register ? 'Sign in' : 'Create an account'}</a></p></section></main>`
  document.querySelector('#customer-auth-form').addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const submit = form.querySelector('button[type="submit"]')
    const status = form.querySelector('.customer-auth-status')
    submit.disabled = true
    status.textContent = ''
    try {
      const path = register ? '/customer/register' : '/customer/login'
      const result = await apiRequest(path, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) })
      customerAccount = result.account
      const nextRoute = sessionStorage.getItem('wenders-pending-booking') ? 'top' : 'account'
      if (window.location.hash === `#${nextRoute}`) renderCustomerRoute()
      else window.location.hash = nextRoute
    } catch (error) {
      status.textContent = error.message
    } finally {
      submit.disabled = false
    }
  })
}

function renderCustomerDashboard() {
  clearInterval(customerPoll)
  app.innerHTML = `<main class="customer-dashboard"><header class="customer-dashboard-header"><a class="brand" href="#top"><span>W</span> WendersBengaluru</a><div><a href="#top">Back to website</a><button class="customer-signout" id="customer-signout" type="button">Sign out</button></div></header><section class="customer-dashboard-main"><p class="eyebrow">Traveller account</p><h1>Welcome, ${escapeHtml(customerAccount.name)}.</h1><p class="customer-dashboard-intro">Your bookings and the latest updates from our travel team.</p><div id="account-bookings" class="account-bookings" aria-live="polite"></div></section></main>`
  document.querySelector('#customer-signout').addEventListener('click', async () => {
    try { await apiRequest('/customer/logout', { method: 'POST' }) } catch {}
    customerAccount = null
    clearInterval(customerPoll)
    window.location.hash = 'top'
  })
}

async function refreshCustomerData() {
  try {
    const result = await apiRequest('/customer/me')
    customerAccount = result.account
    if (window.location.hash === '#account') renderCustomerBookings(result.bookings)
    if (!window.location.hash.startsWith('#account')) {
      const form = document.querySelector('#booking-form')
      if (form && !sessionStorage.getItem('wenders-pending-booking')) {
        if (form.elements.customerName) form.elements.customerName.value ||= customerAccount.name
        if (form.elements.customerEmail) form.elements.customerEmail.value ||= customerAccount.email
        if (form.elements.customerPhone) form.elements.customerPhone.value ||= customerAccount.phone
      }
      if (result.bookings.length) updateBookingJourney(result.bookings[0])
    }
    return result
  } catch (error) {
    if (error.status === 401) customerAccount = null
    if (window.location.hash === '#account' && error.status === 401) renderCustomerAuth(false, 'Your session has ended. Please sign in again.')
    return null
  }
}

function startCustomerPolling() {
  clearInterval(customerPoll)
  customerPoll = setInterval(() => {
    const hash = window.location.hash
    if (hash === '#account' || (!hash.startsWith('#account') && !hash.startsWith('#admin') && hash !== '#login')) refreshCustomerData()
  }, 8000)
}

async function renderCustomerRoute() {
  clearInterval(customerPoll)
  if (window.location.hash === '#account-register') {
    renderCustomerAuth(true)
    return
  }
  try {
    const result = await apiRequest('/customer/me')
    customerAccount = result.account
    renderCustomerDashboard()
    renderCustomerBookings(result.bookings)
    startCustomerPolling()
  } catch (error) {
    customerAccount = null
    renderCustomerAuth(false, error.status === 401 ? '' : 'Account service is unavailable. Start the project server and try again.')
  }
}

function restoreBookingDraft() {
  const form = document.querySelector('#booking-form')
  if (!form) return
  let draft = null
  try { draft = JSON.parse(sessionStorage.getItem('wenders-pending-booking') || 'null') } catch {}
  if (!draft) return
  Object.entries(draft).forEach(([name, value]) => {
    const field = form.elements.namedItem(name)
    if (field && value) field.value = value
  })
  if (customerAccount) {
    form.elements.customerName.value = customerAccount.name
    form.elements.customerEmail.value = customerAccount.email
    form.elements.customerPhone.value = customerAccount.phone
    form.querySelector('.booking-status').textContent = 'You are signed in. Review your trip details and submit to book.'
  }
}

document.addEventListener('submit', async (event) => {
  const form = event.target
  if (form.id !== 'booking-form' || customerAccount) return
  event.preventDefault()
  event.stopImmediatePropagation()
  sessionStorage.setItem('wenders-pending-booking', JSON.stringify(Object.fromEntries(new FormData(form))))
  const submit = form.querySelector('button[type="submit"]')
  const status = form.querySelector('.booking-status')
  submit.disabled = true
  try {
    const result = await apiRequest('/customer/me')
    customerAccount = result.account
    submit.disabled = false
    form.requestSubmit()
  } catch (error) {
    submit.disabled = false
    if (error.status === 401) window.location.hash = 'account-register'
    else status.textContent = error.message
  }
}, true)

function renderLogin() {
  app.innerHTML = `<main class="auth-shell"><a class="brand auth-brand" href="#top"><span>W</span> WendersBengaluru</a><div class="auth-layout"><div class="auth-image travel-auth-image"><span>WendersBengaluru<br><em>Travel studio</em></span></div><section class="auth-panel"><a class="back-link" href="#top">← Back to website</a><p class="eyebrow">Private workspace</p><h1>Welcome<br><em>back.</em></h1><p class="auth-copy">Sign in to manage destinations, enquiries and travel plans.</p><button class="quick-login" id="demo-login" type="button">Continue with demo access <span>↗</span></button><div class="login-divider"><span>or sign in with email</span></div><form id="login-form" class="auth-form"><label>Email address<input type="email" name="email" required value="admin@wendersbengaluru.in"></label><label>Password<div class="password-field"><input id="login-password" type="password" name="password" required value="wenders123"><button id="toggle-password" type="button" aria-label="Show password">Show</button></div></label><label class="remember-login"><input type="checkbox" name="remember" checked> Keep me signed in on this device</label><button class="button button-dark" type="submit">Sign in <span>↗</span></button><p class="form-status" role="status"></p></form><p class="demo-note">Demo access is pre-filled for this prototype.</p></section></div></main>`
  const enterDashboard = () => { sessionStorage.setItem('wenders-session', 'active'); if (window.location.hash === '#admin') render(); else window.location.hash = 'admin' }
  document.querySelector('#demo-login').addEventListener('click', enterDashboard)
  document.querySelector('#login-form').addEventListener('submit', (event) => { event.preventDefault(); enterDashboard() })
  document.querySelector('#toggle-password').addEventListener('click', (event) => { const password = document.querySelector('#login-password'); const visible = password.type === 'text'; password.type = visible ? 'password' : 'text'; event.target.textContent = visible ? 'Show' : 'Hide' })
}

function placeCard(place, index) {
  return `<article class="place-card"><div class="place-image" style="background-image:url('${safeImage(place.image)}')"><span class="status-pill ${place.status.toLowerCase()}">${escapeHtml(place.status)}</span><div class="place-actions"><button class="icon-button" data-edit-place="${index}" aria-label="Edit ${escapeHtml(place.name)}">✎</button><button class="icon-button" data-remove-place="${index}" aria-label="Remove ${escapeHtml(place.name)}">×</button></div></div><div class="place-info"><div><p class="card-kicker">${escapeHtml(place.type)}</p><h3>${escapeHtml(place.name)}</h3><p>${escapeHtml(place.area)}, South India</p></div><span class="card-arrow">↗</span></div></article>`
}

const dashboardIcons = { LayoutDashboard, MapPinned, UsersRound, CalendarCheck, LogOut, Bell, Compass, MessageCircle, CalendarClock, WalletCards, TrendingUp, ArrowRight, Sparkles, Pencil, Trash2, ArrowUpRight, Ellipsis, X }
const iconPlaceholder = (name) => { const element = document.createElement('i'); element.setAttribute('data-lucide', name); element.setAttribute('aria-hidden', 'true'); return element }

function applyAdminIcons(root) {
  const navIcons = ['layout-dashboard', 'map-pinned', 'users-round', 'calendar-check']
  root.querySelectorAll('.admin-nav a').forEach((link, index) => {
    const label = link.querySelector('span')?.textContent.trim() || 'Bookings'
    const textNode = [...link.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)
    if (textNode) textNode.textContent = ''
    link.insertBefore(iconPlaceholder(navIcons[index]), link.firstChild)
    link.setAttribute('aria-label', label)
  })
  const signout = root.querySelector('.signout-link')
  if (signout) {
    const textNode = [...signout.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)
    if (textNode) textNode.textContent = ''
    signout.insertBefore(iconPlaceholder('log-out'), signout.firstChild)
    signout.setAttribute('aria-label', signout.querySelector('span')?.textContent.trim() || 'Sign out')
  }
  const statIcons = ['compass', 'message-circle', 'calendar-clock', 'wallet-cards']
  root.querySelectorAll('.stat-icon').forEach((element, index) => element.replaceChildren(iconPlaceholder(statIcons[index])))
  root.querySelectorAll('.stat-card .positive, .stat-card .neutral').forEach((element) => {
    const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
    if (!textNode) return
    const iconName = textNode.textContent.trim().startsWith('↗') ? 'trending-up' : 'arrow-right'
    textNode.textContent = textNode.textContent.replace(/^[↗→]\s*/, '')
    element.insertBefore(iconPlaceholder(iconName), textNode)
  })
  root.querySelectorAll('.notification-button').forEach((button) => {
    [...button.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node) => node.remove())
    button.prepend(iconPlaceholder('bell'))
  })
  root.querySelectorAll('.admin-topbar h1 span').forEach((element) => element.replaceChildren(iconPlaceholder('sparkles')))
  root.querySelectorAll('.place-actions [data-edit-place]').forEach((element) => element.replaceChildren(iconPlaceholder('pencil')))
  root.querySelectorAll('.place-actions [data-remove-place]').forEach((element) => element.replaceChildren(iconPlaceholder('trash-2')))
  root.querySelectorAll('.card-arrow').forEach((element) => element.replaceChildren(iconPlaceholder('arrow-up-right')))
  root.querySelectorAll('.row-more').forEach((element) => element.replaceChildren(iconPlaceholder('ellipsis')))
  root.querySelectorAll('.modal-close').forEach((element) => element.replaceChildren(iconPlaceholder('x')))
  createIcons({ icons: dashboardIcons, attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true' } })
  root.querySelectorAll('svg.lucide').forEach((element) => element.classList.add('ui-icon'))
}

function showModal(content) {
  const modal = document.querySelector('#admin-modal')
  modal.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal-panel" role="dialog" aria-modal="true">${content}<button class="modal-close" data-close-modal aria-label="Close">×</button></section>`
  modal.classList.remove('hidden')
  applyAdminIcons(modal)
  modal.querySelectorAll('[data-close-modal]').forEach((element) => element.addEventListener('click', () => modal.classList.add('hidden')))
}

function customerDetails(index) {
  const customer = customers[index]
  showModal(`<p class="eyebrow">Traveller details</p><div class="modal-customer-heading"><div class="avatar avatar-table">${customer.name.split(' ').map((part) => part[0]).join('')}</div><div><h2>${escapeHtml(customer.name)}</h2><p>${escapeHtml(customer.email)}</p></div></div><div class="detail-grid"><div><small>Trip</small><strong>${escapeHtml(customer.project)}</strong></div><div><small>From</small><strong>${escapeHtml(customer.location)}</strong></div><div><small>Enquiry date</small><strong>${escapeHtml(customer.date)}</strong></div></div><form id="customer-status-form" class="customer-status-form"><label>Update status<select name="status"><option ${customer.status === 'New' ? 'selected' : ''}>New</option><option ${customer.status === 'In progress' ? 'selected' : ''}>In progress</option><option ${customer.status === 'Proposal sent' ? 'selected' : ''}>Proposal sent</option><option ${customer.status === 'Closed' ? 'selected' : ''}>Closed</option></select></label><button class="button button-dark" type="submit">Save traveller <span>↗</span></button></form>`)
  document.querySelector('#customer-status-form').addEventListener('submit', (event) => { event.preventDefault(); customers[index].status = new FormData(event.target).get('status'); document.querySelector('#admin-modal').classList.add('hidden'); renderAdmin() })
}

function bookingDetails(index) {
  const booking = bookings[index]
  const phone = booking.phone.replace(/\D/g, '')
  showModal(`<p class="eyebrow">Trip booking</p><div class="modal-customer-heading"><div class="avatar avatar-table">${booking.name.split(' ').map((part) => part[0]).join('')}</div><div><h2>${escapeHtml(booking.name)}</h2><p>${escapeHtml(booking.email)} · ${escapeHtml(booking.phone)}</p></div></div><div class="detail-grid"><div><small>Destination</small><strong>${escapeHtml(booking.destination)}</strong></div><div><small>Dates</small><strong>${escapeHtml(booking.arrival)} to ${escapeHtml(booking.departure)}</strong></div><div><small>Travellers</small><strong>${escapeHtml(booking.travellers)}</strong></div></div><form id="booking-status-form" class="customer-status-form"><label>Update status<select name="status"><option ${booking.status === 'New' ? 'selected' : ''}>New</option><option ${booking.status === 'Planning' ? 'selected' : ''}>Planning</option><option ${booking.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option><option ${booking.status === 'Completed' ? 'selected' : ''}>Completed</option><option ${booking.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option></select></label><button class="button button-dark" type="submit">Save update <span>↗</span></button></form><a class="modal-whatsapp" href="https://wa.me/${phone}?text=Hello%20${encodeURIComponent(booking.name)}%2C%20your%20${encodeURIComponent(booking.destination)}%20trip%20request%20is%20being%20planned%20by%20WendersBengaluru." target="_blank" rel="noreferrer">Open WhatsApp conversation ↗</a>`)
  document.querySelector('#booking-status-form').insertAdjacentHTML('afterend', '<button class="delete-booking-button" id="delete-booking" type="button">Delete old booking</button>')
  document.querySelector('#delete-booking').addEventListener('click', async () => { if (!window.confirm(`Delete ${booking.name}'s ${booking.destination} booking?`)) return; try { await apiRequest(`/bookings/${booking.id}`, { method: 'DELETE' }); bookings.splice(index, 1); saveBookings() } catch { return } document.querySelector('#admin-modal').classList.add('hidden'); renderAdmin() })
  document.querySelector('#booking-status-form').addEventListener('submit', async (event) => { event.preventDefault(); const status = new FormData(event.target).get('status'); let notificationSent = false; try { const response = await apiRequest(`/bookings/${booking.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); notificationSent = response.notificationSent } catch { bookings[index].status = status; saveBookings() } sessionStorage.setItem('wenders-booking-notice', status === 'Confirmed' ? (notificationSent ? 'Booking confirmed and WhatsApp update sent to the customer.' : 'Booking confirmed. Configure WhatsApp Business credentials to send the customer an automatic update.') : `Booking status updated to ${status}.`); document.querySelector('#admin-modal').classList.add('hidden'); renderAdmin() })
}

function renderAdmin() {
  app.innerHTML = `<div class="admin-shell"><aside class="admin-sidebar"><a class="brand" href="#top"><span>W</span> WendersBengaluru</a><div class="admin-profile"><div class="avatar">AK</div><div><strong>Arun Kumar</strong><small>Administrator</small></div></div><nav class="admin-nav"><a class="active" href="#admin">⌂ <span>Overview</span></a><a href="#admin-places">▧ <span>Destinations</span><b>${places.length}</b></a><a href="#admin-customers">◎ <span>Travellers</span><b>${customers.length}</b></a></nav><a class="signout-link" href="#top">↩ <span>View website</span></a></aside><main class="admin-main"><header class="admin-topbar"><div class="mobile-brand"><a class="brand" href="#top"><span>W</span> WendersBengaluru</a></div><div><p class="admin-date">Tuesday, 23 September 2026</p><h1>Good morning, Arun <span>✦</span></h1></div><div class="admin-actions"><button class="notification-button" id="notifications-button" aria-label="Notifications">♧<i></i></button><div class="avatar avatar-small">AK</div></div></header><section class="stats-grid"><div class="stat-card"><span class="stat-icon coral">◎</span><div><p>Live destinations</p><strong>${places.filter((place) => place.status === 'Live').length}</strong><small class="positive">↗ 12.5% <span>vs last month</span></small></div></div><div class="stat-card"><span class="stat-icon sage">◌</span><div><p>New trip enquiries</p><strong>18</strong><small class="positive">↗ 8.2% <span>vs last month</span></small></div></div><div class="stat-card"><span class="stat-icon sand">◒</span><div><p>Trips in planning</p><strong>7</strong><small class="neutral">→ 2 depart this week</small></div></div><div class="stat-card"><span class="stat-icon ink">↗</span><div><p>Booking pipeline</p><strong>₹18.4L</strong><small class="positive">↗ 16.8% <span>vs last month</span></small></div></div></section><section id="admin-places" class="admin-section"><div class="admin-section-heading"><div><p class="eyebrow">Your travel guide</p><h2>Destinations</h2></div><button class="button button-dark" id="toggle-place-form">+ Add destination</button></div><form id="place-form" class="place-form hidden"><input type="hidden" name="editingIndex" value=""><label>Destination<input name="name" required placeholder="e.g. Sakleshpur"></label><label>Region<input name="area" required placeholder="e.g. Karnataka"></label><label>Type<select name="type"><option>Hill station</option><option>Forest escape</option><option>Heritage city</option><option>Coffee country</option><option>Coastal escape</option><option>Rainy retreat</option></select></label><label>Nature image URL<input name="image" required placeholder="https://images.unsplash.com/..."></label><button class="button button-light" type="submit">Save destination <span>↗</span></button></form><div class="places-grid">${places.map(placeCard).join('')}</div></section><section id="admin-customers" class="admin-section customers-section"><div class="admin-section-heading"><div><p class="eyebrow">Recent activity</p><h2>Travellers</h2></div><button class="text-button" id="view-customers">View all travellers ↗</button></div><div class="table-wrap"><table><thead><tr><th>Traveller</th><th>Trip</th><th>From</th><th>Enquiry date</th><th>Status</th><th></th></tr></thead><tbody>${customers.map((customer, index) => `<tr><td><div class="customer-cell"><div class="avatar avatar-table">${customer.name.split(' ').map((part) => part[0]).join('')}</div><div><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.email)}</small></div></div></td><td>${escapeHtml(customer.project)}</td><td>${escapeHtml(customer.location)}</td><td>${escapeHtml(customer.date)}</td><td><span class="customer-status ${customer.status.toLowerCase().replace(' ', '-')}">${escapeHtml(customer.status)}</span></td><td><button class="row-more" data-customer="${index}" aria-label="View ${escapeHtml(customer.name)}">···</button></td></tr>`).join('')}</tbody></table></div></section></main><div id="admin-modal" class="modal hidden"></div></div>`
  document.querySelector('.admin-nav').insertAdjacentHTML('beforeend', `<a href="#admin-bookings">◷ <span>Bookings</span><b>${bookings.length}</b></a>`)
  const latestBooking = sessionStorage.getItem('wenders-last-booking')
  if (latestBooking) { document.querySelector('.admin-topbar').insertAdjacentHTML('afterend', `<div class="admin-notice"><span>New booking received</span><strong>${escapeHtml(latestBooking)}</strong> is ready for review in Bookings.</div>`); sessionStorage.removeItem('wenders-last-booking') }
  const bookingNotice = sessionStorage.getItem('wenders-booking-notice')
  if (bookingNotice) { document.querySelector('.admin-topbar').insertAdjacentHTML('afterend', `<div class="admin-notice"><span>${escapeHtml(bookingNotice)}</span></div>`); sessionStorage.removeItem('wenders-booking-notice') }
  document.querySelector('#admin-places').insertAdjacentHTML('beforebegin', `<section id="admin-bookings" class="admin-section booking-admin-section"><div class="admin-section-heading"><div><p class="eyebrow">Customer requests</p><h2>Bookings</h2></div><span class="booking-count">${bookings.length} saved locally</span></div>${bookings.length ? `<div class="table-wrap"><table><thead><tr><th>Traveller</th><th>Destination</th><th>Dates</th><th>Guests</th><th>Status</th><th></th></tr></thead><tbody>${bookings.map((booking, index) => `<tr><td><div class="customer-cell"><div class="avatar avatar-table">${booking.name.split(' ').map((part) => part[0]).join('')}</div><div><strong>${escapeHtml(booking.name)}</strong><small>${escapeHtml(booking.email)}</small></div></div></td><td>${escapeHtml(booking.destination)}</td><td>${escapeHtml(booking.arrival)} → ${escapeHtml(booking.departure)}</td><td>${escapeHtml(booking.travellers)}</td><td><span class="customer-status ${booking.status.toLowerCase()}">${escapeHtml(booking.status)}</span></td><td><button class="row-more" data-booking="${index}" aria-label="View booking for ${escapeHtml(booking.name)}">···</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-bookings">Customer bookings will appear here after the first request is submitted.</div>'}</section>`)
  document.querySelector('#admin-bookings .admin-section-heading').insertAdjacentHTML('beforeend', '<div class="booking-tools"><span class="live-indicator"><i></i> Live updates</span><button class="refresh-bookings" id="refresh-bookings" type="button">Refresh</button></div>')
  document.querySelector('#refresh-bookings').addEventListener('click', async (event) => { const button = event.currentTarget; button.disabled = true; await syncServerData(); button.disabled = false })
  document.querySelectorAll('[data-booking]').forEach((button) => button.addEventListener('click', () => bookingDetails(Number(button.dataset.booking))))
  document.querySelector('.signout-link span').textContent = 'Sign out'
  document.querySelector('.signout-link').addEventListener('click', () => sessionStorage.removeItem('wenders-session'))
  const placeForm = document.querySelector('#place-form')
  document.querySelector('#toggle-place-form').addEventListener('click', () => { placeForm.classList.toggle('hidden'); placeForm.querySelector('input[name="name"]').focus() })
  placeForm.addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.target); const editingIndex = data.get('editingIndex'); const record = { name: data.get('name'), area: data.get('area'), type: data.get('type'), status: editingIndex === '' ? 'Draft' : places[Number(editingIndex)].status, image: data.get('image'), description: 'A new South Indian escape to discover.' }; if (editingIndex === '') places.unshift(record); else places[Number(editingIndex)] = record; savePlaces(); renderAdmin() })
  document.querySelectorAll('[data-edit-place]').forEach((button) => button.addEventListener('click', () => { const place = places[Number(button.dataset.editPlace)]; placeForm.classList.remove('hidden'); placeForm.querySelector('[name="editingIndex"]').value = button.dataset.editPlace; placeForm.querySelector('[name="name"]').value = place.name; placeForm.querySelector('[name="area"]').value = place.area; placeForm.querySelector('[name="type"]').value = place.type; placeForm.querySelector('[name="image"]').value = place.image; placeForm.scrollIntoView({ behavior: 'smooth', block: 'center' }) }))
  document.querySelectorAll('[data-remove-place]').forEach((button) => button.addEventListener('click', () => { if (confirm('Remove this destination from the guide?')) { places.splice(Number(button.dataset.removePlace), 1); savePlaces(); renderAdmin() } }))
  document.querySelectorAll('[data-customer]').forEach((button) => button.addEventListener('click', () => customerDetails(Number(button.dataset.customer))))
  document.querySelector('#view-customers').addEventListener('click', () => document.querySelector('#admin-customers').scrollIntoView({ behavior: 'smooth' }))
  document.querySelector('#notifications-button').addEventListener('click', () => showModal(`<p class="eyebrow">Notifications</p><h2>Travel inbox</h2><div class="notification-list"><p><strong>New trip enquiry</strong><span>Ananya Rao is asking about an Ooty weekend.</span></p><p><strong>Route update</strong><span>Wayanad guide images are ready for review.</span></p><p><strong>Weekly summary</strong><span>Your destination guide received 18 new enquiries.</span></p></div>`))
  const greeting = document.querySelector('.admin-topbar h1')
  greeting.firstChild.textContent = greeting.firstChild.textContent.replace('Arun', 'Siddiq')
  document.querySelector('.admin-profile strong').textContent = 'Siddiq'
  document.querySelector('.admin-profile .avatar').textContent = 'SI'
  document.querySelector('.admin-actions .avatar-small').textContent = 'SI'
  document.querySelector('.admin-actions').append(document.querySelector('.signout-link'))
  applyAdminIcons(app)
  if (!serverReady) syncServerData()
  startBookingPolling()
}

function renderLocalOnly() { app.innerHTML = `<main class="auth-shell"><section class="auth-panel access-denied"><p class="eyebrow">Private workspace</p><h1>Local access<br><em>only.</em></h1><p class="auth-copy">The WendersBengaluru admin area is available only from the local machine that runs the app.</p><a class="button button-dark" href="#top">Back to website <span>↗</span></a></section></main>` }
function render() {
  const hash = window.location.hash
  const adminRoute = ['#admin', '#admin-places', '#admin-customers'].includes(hash)
  const customerRoute = hash === '#account' || hash === '#account-register'
  const adminHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
  if (hash === '#logout') { sessionStorage.removeItem('wenders-session'); window.location.hash = 'top'; return }
  if ((adminRoute || hash === '#login') && !adminHost) renderLocalOnly()
  else if (hash === '#login' || (adminRoute && sessionStorage.getItem('wenders-session') !== 'active')) renderLogin()
  else if (adminRoute) renderAdmin()
  else if (customerRoute) renderCustomerRoute()
  else {
    renderSite()
    restoreBookingDraft()
    refreshCustomerData()
    startCustomerPolling()
  }
}
window.addEventListener('hashchange', render)
render()