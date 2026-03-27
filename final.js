document.addEventListener("DOMContentLoaded", function () {
  const slides = document.querySelector(".slides");
  const dots = document.querySelectorAll(".dot");
  const prevBtn = document.querySelector(".prev-btn");
  const nextBtn = document.querySelector(".next-btn");
  const totalSlides = 4;
  let currentSlide = 0;
  let autoSlideInterval;

  // Function to update slide position
  function goToSlide(slideIndex) {
    currentSlide = slideIndex;
    slides.style.transform = `translateX(-${currentSlide * 25}%)`;

    // Update active dot
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentSlide);
    });
  }

  // Next slide function
  function nextSlide() {
    goToSlide((currentSlide + 1) % totalSlides);
  }

  // Previous slide function
  function prevSlide() {
    goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
  }

  // Setup auto sliding
  function startAutoSlide() {
    autoSlideInterval = setInterval(nextSlide, 5000);
  }

  // Stop auto sliding
  function stopAutoSlide() {
    clearInterval(autoSlideInterval);
  }

  // Event listeners for navigation
  nextBtn.addEventListener("click", () => {
    stopAutoSlide();
    nextSlide();
    startAutoSlide();
  });

  prevBtn.addEventListener("click", () => {
    stopAutoSlide();
    prevSlide();
    startAutoSlide();
  });

  // Event listeners for dots
  dots.forEach((dot) => {
    dot.addEventListener("click", function () {
      stopAutoSlide();
      goToSlide(parseInt(this.getAttribute("data-slide")));
      startAutoSlide();
    });
  });

  // Pause auto slide when hovering over slider
  const slider = document.querySelector(".slider");
  slider.addEventListener("mouseenter", stopAutoSlide);
  slider.addEventListener("mouseleave", startAutoSlide);

  // Initialize auto slide
  startAutoSlide();

  // Simple countdown timer (for demonstration)
  function updateCountdowns() {
    // This would normally calculate actual time differences
    // For demo, we're just rotating numbers
    const countdownValues = document.querySelectorAll(".countdown-value");
    countdownValues.forEach((value) => {
      const current = parseInt(value.textContent);
      value.textContent = (current + 1) % 60;
    });
  }

  setInterval(updateCountdowns, 60000);
});
