export class SafetyEvaluator {
  evaluateRoutes(criteria, zones, facilityData) {
    const evaluatedZones = [];
    let worstGradeNum = 1; 
    const gradePriority = { safe: 1, caution: 2, danger: 3 };
    const numToGrade = { 1: 'safe', 2: 'caution', 3: 'danger' };

    for (const zone of zones) {
      let penalty = 0;
      let hotspotIds = [];
      
      for (const facilityOrZone of zones) {
        if (facilityOrZone.type === 'hotspot' || facilityOrZone.years) {
          const distance = this.calculateDistance(
            zone.lat, zone.lng, 
            facilityOrZone.lat, facilityOrZone.lng
          );
          
          if (distance <= (criteria.radius_m || 300)) {
            const yearCount = facilityOrZone.years ? facilityOrZone.years.length : 1;
            const currentPenalty = yearCount >= 2 ? criteria.hotspot_penalty.repeated : criteria.hotspot_penalty.once;
            
            if (currentPenalty < penalty) {
              penalty = currentPenalty;
            }
            if (facilityOrZone.id && !hotspotIds.includes(facilityOrZone.id)) {
              hotspotIds.push(facilityOrZone.id);
            }
          }
        }
      }

      let totalAvailableScore = 0;
      let earnedScore = 0;
      const evaluatedItems = [];

      for (const item of criteria.items) {
        const isDataAvailable = facilityData.available.includes(item.facility);

        if (!isDataAvailable) {
          evaluatedItems.push({
            id: item.id,
            name: item.name,
            status: "no_data",
            count: null
          });
          continue; 
        }

        totalAvailableScore += item.score;

        const count = this.countFacilityWithinRadius(zone, facilityData.facilities, item.facility, criteria.radius_m || 300);
        let isMet = false;

        if (item.rule === "min_count") {
          isMet = count >= item.value;
        } else if (item.rule === "max_count") {
          isMet = count <= item.value;
        } else if (item.rule === "max_speed") {
          const speed = this.getSpeedLimitWithinRadius(zone, facilityData.facilities, item.facility, criteria.radius_m || 300);
          isMet = speed !== null && speed <= item.value;
        }

        if (isMet) {
          earnedScore += item.score;
          evaluatedItems.push({
            id: item.id,
            name: item.name,
            status: "met",
            count: count
          });
        } else {
          evaluatedItems.push({
            id: item.id,
            name: item.name,
            status: "not_met",
            count: count
          });
        }
      }

      let baseScore = null;
      let finalScore = null;

      if (totalAvailableScore > 0) {
        baseScore = Math.round((earnedScore / totalAvailableScore) * 100);
        finalScore = baseScore + penalty; 
        finalScore = Math.max(0, Math.min(100, finalScore));
      }

      const lowConfidence = totalAvailableScore < criteria.low_confidence_below;

      let grade = "safe";
      if (finalScore !== null) {
        if (finalScore >= criteria.grades.safe) {
          grade = "safe";
        } else if (finalScore >= criteria.grades.caution) {
          grade = "caution";
        } else {
          grade = "danger";
        }
      }

      if (penalty < 0 && grade === "safe") {
        grade = "caution";
      }

      evaluatedZones.push({
        zoneId: zone.id,
        name: zone.name,
        type: zone.type,
        baseScore: baseScore,
        penalty: penalty,
        score: finalScore,
        grade: grade,
        lowConfidence: lowConfidence,
        hotspotIds: hotspotIds,
        items: evaluatedItems
      });

      if (gradePriority[grade] > worstGradeNum) {
        worstGradeNum = gradePriority[grade];
      }
    }

    return {
      routeGrade: numToGrade[worstGradeNum],
      zones: evaluatedZones
    };
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  countFacilityWithinRadius(zone, facilities, facilityType, radiusMeters) {
    if (!facilities || !Array.isArray(facilities)) return 0;

    let count = 0;
    for (const facility of facilities) {
      if (facility.type === facilityType) {
        const distance = this.calculateDistance(zone.lat, zone.lng, facility.lat, facility.lng);
        if (distance <= radiusMeters) {
          count++;
        }
      }
    }
    return count;
  }

  getSpeedLimitWithinRadius(zone, facilities, facilityType, radiusMeters) {
    if (!facilities || !Array.isArray(facilities)) return null;

    for (const facility of facilities) {
      if (facility.type === facilityType) {
        const distance = this.calculateDistance(zone.lat, zone.lng, facility.lat, facility.lng);
        if (distance <= radiusMeters && facility.speedLimit !== undefined) {
          return facility.speedLimit;
        }
      }
    }
    return null;
  }
}