export const geocodeCity = async (req, res) => {
  const { address } = req.query

  if (!address) {
    return res.status(400).json({ message: 'Address is required' })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    )
    const data = await response.json()

    if (data.results.length === 0) {
      return res.status(404).json({ message: 'City not found' })
    }

    const { lat, lng } = data.results[0].geometry.location
    const formattedAddress = data.results[0].formatted_address

    res.status(200).json({ lat, lng, formattedAddress })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

export const reverseGeocode = async (req, res) => {
  const { lat, lng } = req.query

  if (!lat || !lng) {
    return res.status(400).json({ message: 'lat and lng are required' })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    )
    const data = await response.json()

    if (data.results.length === 0) {
      return res.status(404).json({ message: 'Location not found' })
    }

    const components = data.results[0].address_components
    const city = components.find((c) => c.types.includes('locality'))?.long_name
    const province = components.find((c) => c.types.includes('administrative_area_level_1'))?.short_name
    const cityLabel = city && province ? `${city}, ${province}` : data.results[0].formatted_address

    res.status(200).json({ cityLabel })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

export const autocompleteCity = async (req, res) => {
  const { input } = req.query

  if (!input) {
    return res.status(400).json({ message: 'Input is required' })
  }

  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: ['locality', 'administrative_area_level_1'],
        }),
      }
    )
    const data = await response.json()

    if (!data.suggestions) {
      return res.status(200).json({ suggestions: [] })
    }

    const suggestions = data.suggestions.map((s) => ({
      description: s.placePrediction.text.text,
      place_id: s.placePrediction.placeId,
    }))

    res.status(200).json({ suggestions })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}