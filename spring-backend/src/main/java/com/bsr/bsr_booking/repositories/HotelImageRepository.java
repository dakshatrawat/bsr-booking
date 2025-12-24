package com.bsr.bsr_booking.repositories;

import com.bsr.bsr_booking.entities.HotelImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface HotelImageRepository extends JpaRepository<HotelImage, Long> {
    
    @Query("SELECT h FROM HotelImage h ORDER BY h.displayOrder ASC, h.createdAt ASC")
    List<HotelImage> findAllOrderedByDisplayOrder();
    
    @Query("SELECT COALESCE(MAX(h.displayOrder), 0) FROM HotelImage h")
    Integer findMaxDisplayOrder();
}

