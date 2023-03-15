'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  _click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//const runner1 = new Running([39, -12], 5.2, 24, 178);
//console.log(runner1);
///////////////////////////
//Application Architecture
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  constructor() {
    this._getPosition(); // this method call leads to load map and show form
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this)); //when submitted newWorkout: this is where Workout child class objects are constructed
    inputType.addEventListener('change', this._toggleElevation); //toggle between inputTypes
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), // call load map function
        function () {
          alert(`could not get your position`);
        }
      );
  }
  // pass position object from getCurrent Position method
  _loadMap(position) {
    const { latitude } = position.coords; // deconstruct obeject
    const { longitude } = position.coords;
    const coords = [latitude, longitude]; // make into array

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); //when LoadMap was called it was bound to App class the private map variable is set to some shit that the library works with to load map
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this)); // map variable has event handler called "on" the function that it calls in showForm
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _toggleElevation() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _showForm(mapE) {
    this.#mapEvent = mapE; //mapEvent variable set to mapE that gets passed by on method?
    form.classList.remove('hidden'); // form unhidden
    inputDistance.focus(); //ehh i forget something to do with form html or css file
  }
  _hideForm() {
    //Clear input fields
    // prettier-ignore
    inputDistance.value = inputDuration.value =inputElevation.value =inputCadence.value = '';
    form.style.display = 'none';
    form.classList.add('hidden'); // form unhidden
    setTimeout(() => ((form.style.display = 'grid'), 1000));
  }
  _newWorkout(e) {
    //helper functions
    const validInputs = (
      ...inputs //...variables groupped into array
    ) => inputs.every(inp => Number.isFinite(inp)); //iterated and return false if nonfinite #
    const allpositive = (...inputs) => inputs.every(inp => inp > 0); //returns false if non positve
    e.preventDefault();

    //Get data from form
    const type = inputType.value; // read type from form
    const distance = +inputDistance.value; //read make num
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng; // read map event click object look up deconstruct latlang object property
    let workout;
    //check data validity (ie all values positive)
    if (type === 'running') {
      //if type read from form is runnng
      const cadance = +inputCadence.value; //read cadance value to variable and make number instead of str
      if (
        !validInputs(distance, duration, cadance) || //if either valid inputs or
        !allpositive(distance, duration, cadance) // all positive return false
      )
        return alert('Inputs have to be positve numbers'); //alert and return out of _newWorkout function
      workout = new Running([lat, lng], distance, duration, cadance); // create workout object
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !validInputs(distance, duration)
      )
        return alert('Inputs have to be positve numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add workout to workout array
    this.#workouts.push(workout); //push to workouts array
    //console.log(workout);

    //Render workout marker
    this._renderWorkoutMarker(workout);
    //Render workout on list
    this._renderWorkout(workout);
    // Hide form + clear input fields
    this._hideForm();
    // set local storage for all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴🏽‍♀️'}${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴🏽‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === 'running')
      html += `<div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
</li>
`;
    if (workout.type === 'cycling')
      html += `          
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${workout.elevationGain}</span>
    <span class="workout__unit">m</span>
  </div>
</li> 
`;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    if (!this.#map) return;
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
    //workout._click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    //e.log(data);
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
