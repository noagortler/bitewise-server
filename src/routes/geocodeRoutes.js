import express from 'express'
import { geocodeCity, reverseGeocode, autocompleteCity } from '../controllers/geocodeController.js'

const router = express.Router()

router.get('/', geocodeCity)
router.get('/reverse', reverseGeocode)
router.get('/autocomplete', autocompleteCity)

export default router