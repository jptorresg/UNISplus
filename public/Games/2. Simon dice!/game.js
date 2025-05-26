document.addEventListener("DOMContentLoaded", function() {
    let buttonColours = ["red", "blue", "green", "yellow"];
    let gamePattern = [];
    let userClickedPattern = [];
    let started = false;
    let level = 0;

    document.getElementById("start-btn").addEventListener("click", function() {
        if (!started) {
            started = true;
            this.style.display = "none"; // Ocultar botón de inicio
            nextSequence();
        }
    });

    function nextSequence() {
        userClickedPattern = [];
        level++;
        document.querySelector("#level-title").textContent = "Level " + level;

        let randomNumber = Math.floor(Math.random() * 4);
        let randomChosenColour = buttonColours[randomNumber];
        gamePattern.push(randomChosenColour);

        document.getElementById(randomChosenColour).classList.add("pressed");
        setTimeout(() => {
            document.getElementById(randomChosenColour).classList.remove("pressed");
        }, 100);

        playSound(randomChosenColour);
    }

    document.querySelectorAll(".btn").forEach(button => {
        button.addEventListener("click", function() {
            let userChosenColour = this.id;
            userClickedPattern.push(userChosenColour);

            playSound(userChosenColour);
            animatePress(userChosenColour);

            checkAnswer(userClickedPattern.length - 1);
        });
    });

    function checkAnswer(currentLevel) {
        if (userClickedPattern[currentLevel] === gamePattern[currentLevel]) {
            if (userClickedPattern.length === gamePattern.length) {
                setTimeout(nextSequence, 1000);
            }
        } else {
            playSound("wrong");
            document.body.classList.add("game-over");
            setTimeout(() => {
                document.body.classList.remove("game-over");
            }, 200);
            document.querySelector("#level-title").textContent = "Game Over";
            resetGame();
        }
    }

    function playSound(name) {
        let audio = new Audio("sounds/" + name + ".mp3");
        audio.play();
    }

    function animatePress(currentColour) {
        let button = document.getElementById(currentColour);
        button.classList.add("pressed");
        setTimeout(() => {
            button.classList.remove("pressed");
        }, 100);
    }

    function resetGame() {
        level = 0;
        gamePattern = [];
        started = false;
        document.getElementById("start-btn").style.display = "inline-block";
        document.querySelector("#level-title").textContent = "Try Again!";
    }
});