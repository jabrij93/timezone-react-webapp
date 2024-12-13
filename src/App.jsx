import { useEffect, useState } from 'react'
import Clock from 'react-clock';  // Importing the clock component
import 'react-clock/dist/Clock.css';  // Importing default styles
import axios from 'axios';
import { formatDateTime } from '../helper.js';
import { TIMEZONE_API_KEY } from '../utils/config.js';  // Importing the key from config.js
import './App.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Import FontAwesomeIcon component
import { faTrash } from '@fortawesome/free-solid-svg-icons'; // Import the trash icon
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'; // Import refresh icon

function App() {
  const [timezones, setTimezones] = useState([]);
  const [city, setCity] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  const [containers, setContainers] = useState([{ city: 'Jakarta', selectedTimezone: null, referenceTime: new Date() }]); // Updated containers to hold both city and timezone
  console.log("containers", containers)

  useEffect(() => {
    const getAll = async () => {
      const timezoneDB = `https://api.timezonedb.com/v2.1/list-time-zone?key=${TIMEZONE_API_KEY}&format=json`
      try {
        const response = await axios.get(timezoneDB);
        if (response.data?.zones?.length) {
          setTimezones(response.data.zones);  
        } else {
          console.error('Unexpected data format', response.data);
        }
      } catch (error) {
        console.error('Error fetching the data', error);
      }
    };
    getAll();
  }, []);

  useEffect(() => {
    if (timezones.length > 0) {
      const matchingTimezone = timezones.find(zone => {
        const cityNameFromZone = zone.zoneName.split('/')[1].replace('_', ' ').toLowerCase();
        return cityNameFromZone.includes(city.toLowerCase());
      });

      console.log("Matching TIMEZONE", matchingTimezone)
  
      if (matchingTimezone) {
        setSelectedTimezone({
          ...matchingTimezone,
          timestamp: Math.floor(Date.now() / 1000)  // Use current timestamp
        });
      }
    }
  }, [city, timezones]);
  
  console.log("timezoneDB", timezones)
  console.log("timezoneDB.zones", timezones.zones)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setContainers(containers => 
        containers.map(container => ({
          ...container,
          currentTime: new Date()  // Update the currentTime for each container every second
        }))
      );
    }, 1000);

    return () => clearInterval(intervalId);  // Clean up the interval on component unmount
  }, []);

  const handleAddCity = () => {
    setContainers([...containers, { city: '', selectedTimezone: null, currentTime: new Date() }]);
  };

  const handleDeleteCity = (indexToDelete) => {
    setContainers(containers.filter((_, index) => index !== indexToDelete));
  };

  const handleClearCity = (index) => {
    const updatedContainers = [...containers];
    updatedContainers[index] = {
      ...updatedContainers[index],
      city: '',  // Clear the city name
      selectedTimezone: null,  // Reset the timezone data
      referenceTime: new Date()  // Reset the reference time to the current time
    };
    setContainers(updatedContainers);  // Update the state with the cleared container
  };
  

  // Handle city change and fetch corresponding timezone data
const handleCityChange = (index, newCity) => {
  const updatedContainers = [...containers];
  updatedContainers[index].city = newCity;

  // Find matching timezone based on city name
  const matchingTimezone = timezones.find(zone => {
    const cityNameFromZone = zone.zoneName.split('/')[1].replace('_', ' ').toLowerCase();
    return cityNameFromZone.includes(newCity.toLowerCase());
  });

  if (matchingTimezone) {
    updatedContainers[index].selectedTimezone = {
      ...matchingTimezone,
      timestamp: Math.floor(Date.now() / 1000), // Use current timestamp
    };
    
    // Automatically set referenceTime to the city's current time if it's the first container
    if (index === 0) {
      updatedContainers[0].referenceTime = new Date(); // Update the first container's reference time to the current time
    } else {
      // Adjust the time difference for other cities based on the first container's reference time
      const gmtOffsetDifferenceInMs = (matchingTimezone.gmtOffset - updatedContainers[0].selectedTimezone.gmtOffset) * 1000;

      // Set the referenceTime for the new city by adjusting the time using the offset difference
      updatedContainers[index].referenceTime = new Date(updatedContainers[0].referenceTime.getTime() + gmtOffsetDifferenceInMs);
    }
  } else {
    updatedContainers[index].selectedTimezone = null; // Clear the timezone if no match
  }

  setContainers(updatedContainers); // Update containers with the new city and timezone
};

  // Adjust time for reference city (first container)
  const adjustReferenceTime = (newTime) => {
    const updatedContainers = containers.map((container, index) => {
      if (index === 0) {
        // For the first container, just set the new reference time
        return { ...container, referenceTime: newTime };
      } else {
        // For other containers, calculate the time difference based on the first container's reference time and adjust accordingly
        const gmtOffsetDifferenceInMs = (container.selectedTimezone.gmtOffset - containers[0].selectedTimezone.gmtOffset) * 1000;
        return { 
          ...container, 
          referenceTime: new Date(newTime.getTime() + gmtOffsetDifferenceInMs)
        };
      }
    });
  
    setContainers(updatedContainers);  // Update the state
  };

  {/* Format the referenceTime as a 12-hour format string before rendering */}
  const currentTime = (index) => { 
    return containers[index].referenceTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
  })}

  // Handle time input change for the reference city
  const handleTimeInputChange = (event) => {
    const timeString = event.target.value; // Get the time in "HH:MM" format
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Create a new Date object with the selected hours and minutes
    const newReferenceTime = new Date();
    newReferenceTime.setHours(hours);
    newReferenceTime.setMinutes(minutes);
    newReferenceTime.setSeconds(0); // Reset seconds to 0
    
    adjustReferenceTime(newReferenceTime); // Update the reference time
  };

  return (
    <div>
      <h4> Timezone Web App </h4>
  
      <div className='timezone-wrapper'>
        {containers.map((container, index) => (
          <div key={index} className='timezone'>
              
                <input
                  placeholder='Set a city'
                  value={container.city}
                  onChange={event => handleCityChange(index, event.target.value)} // Handle city change for each container
                />

                {container.selectedTimezone ? (
                  <div>
                    <div>City: {container.selectedTimezone.zoneName.split('/')[1].replace('_', ' ')}</div>
                    <div>Country: {container.selectedTimezone.countryName}</div>
                    <div>
                      Date Today: {formatDateTime(container.selectedTimezone.timestamp, container.selectedTimezone.gmtOffset).formattedDate}
                    </div>

                    {/* Only show "Current Time" for containers other than the first one */}
                      <div>
                        {/* Format the referenceTime as a 12-hour format string before rendering */}
                        Time Now: {currentTime(index)}
                      </div>
                    
                    {/* Reference city (first city) allows time manipulation */}
                    {index === 0 ? (
                      <div className='clock'>
                        <div> Insert Time: 
                          <input
                            type="time"
                            onChange={handleTimeInputChange} // Handle time input change
                            placeholder='insert any time(12-hour format)'
                          /> 
                        </div>
                        <Clock value={containers[0].referenceTime} renderNumbers={true} />
                        <div className='icons'>
                          <FontAwesomeIcon
                                icon={faSyncAlt}  // Clear button (refresh icon)
                                onClick={() => handleClearCity(index)}  // Add functionality to clear the city
                                style={{ marginRight: '0' }}
                              />
                          </div>
                      </div>
                      
                    ) : (
                      <div className='clock'>
                        {/* Render the adjusted time for other cities */}
                        <br/>
                        <Clock value={containers[index].referenceTime} renderNumbers={true} />
                        <div className='icons'>
                          
                            <FontAwesomeIcon
                              icon={faSyncAlt}  // Clear button (refresh icon)
                              onClick={() => handleClearCity(index)}  // Add functionality to clear the city
                              style={{ marginRight: '8px' }}
                            />
                            <FontAwesomeIcon
                              icon={faTrash} 
                              onClick={() => handleDeleteCity(index)} 
                            />
                          
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>Set a city...</div>
                )}
              </div>
        ))}
    
        <div className='addTimezone'>
          <button onClick={handleAddCity}> + </button>
        </div>
      </div>
    </div>  
  );
}

export default App
