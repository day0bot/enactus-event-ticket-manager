import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import PropTypes from "prop-types";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "../stylesheets/Swiper.css"; // Custom styles for Swiper

function SwiperComponent({ slides }) {
  // Default cards with placeholder images if no slides provided
  const defaultCards = [
    {
      id: 1,
      image:
        "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&h=500&auto=format",
      title: "Music Festival",
      description: "Experience live music like never before",
    },
    {
      id: 2,
      image:
        "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800&h=500&auto=format",
      title: "Tech Conference",
      description: "Join industry leaders and innovators",
    },
    {
      id: 3,
      image:
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800&h=500&auto=format",
      title: "Sports Event",
      description: "Witness the excitement of competition",
    },
    {
      id: 4,
      image:
        "https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=800&h=500&auto=format",
      title: "Theater Show",
      description: "Immerse yourself in storytelling",
    },
  ];

  // Custom pagination with exactly 4 bullets
  const pagination = {
    clickable: true,
    renderBullet: function (index, className) {
      // Only show 4 bullets
      if (index < 4) {
        return `<span class="${className}"></span>`;
      }
      return "";
    },
  };

  return (
    <Swiper
      modules={[Pagination, Autoplay]}
      spaceBetween={20}
      slidesPerView={1}
      pagination={pagination}
      loop={true} // Infinite scrolling
      autoplay={{ delay: 3000, disableOnInteraction: false }}
      breakpoints={{
        640: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      }}
    >
      {slides ? (
        slides.map((slide, index) => (
          <SwiperSlide key={index}>{slide}</SwiperSlide>
        ))
      ) : (
        <>
          {defaultCards.map((card) => (
            <SwiperSlide key={card.id}>
              <div
                className="card event-card"
                style={{ overflow: "hidden", borderRadius: "8px" }}
              >
                <img
                  src={card.image}
                  alt={card.title}
                  className="card-img-top"
                  style={{
                    height: "220px",
                    objectFit: "cover",
                    width: "100%",
                  }}
                />
                <div className="card-body p-4">
                  <h5 className="card-title text-xl font-bold text-gray-800 mb-2 hover:text-yellow-500 transition-colors duration-300">
                    {card.title}
                  </h5>
                  <p className="card-text text-gray-600 text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </>
      )}
    </Swiper>
  );
}

SwiperComponent.propTypes = {
  slides: PropTypes.array,
};

export default SwiperComponent;
