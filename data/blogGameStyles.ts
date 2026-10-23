import type { BlogPost } from '../types';

export const gameStylesBlogPost: BlogPost = {
  id: 8,
  title: 'Eight new looks for your classroom games, including Halloween',
  subtitle: 'Choose a style that suits your class, switch it during a game, and try our spooky seasonal extra.',
  date: 'October 23, 2026',
  image: '/assets/blog-game-styles.webp',
  content: `
    <p class="lead">Your classroom games have a new wardrobe. You can now choose from eight visual styles, from the familiar blue and yellow of Classic to glowing Pinball Chrome and a Halloween theme with a few unexpected visitors.</p>
    <p>The style changes the look of your game: its panels, question cards, scoreboard, buttons and menus. Your questions, scores and game rules stay the same, so you can give a favourite activity a fresh look without preparing it again.</p>

    <h2>Find your classroom's favourite look</h2>
    <ul>
      <li><strong>Classic:</strong> our familiar blue and yellow, with a clear, straightforward layout.</li>
      <li><strong>Comic Pop:</strong> bold outlines, bright colours and a comic-book feel.</li>
      <li><strong>Pinball Chrome:</strong> metallic borders, dark panels and neon accents for an arcade atmosphere.</li>
      <li><strong>Toy Blocks:</strong> colourful building-block panels with little studs and raised edges.</li>
      <li><strong>Paper Cut:</strong> layered paper shapes, teal outlines and warm coral details.</li>
      <li><strong>Candy Circuit:</strong> pink and cream panels, rounded corners and candy-coloured details.</li>
      <li><strong>Halloween:</strong> orange and black, cobwebs, pumpkins, bats and some spooky moving guests.</li>
      <li><strong>Neon Lights:</strong> vivid pink, cyan and lime frames, glowing lettering and a neon shop-sign feel against a dark background.</li>
    </ul>

    <figure><img src="/assets/blog-game-styles.webp" alt="Previews of Classic, Comic Pop, Pinball Chrome, Toy Blocks, Paper Cut, Candy Circuit, Halloween and Neon Lights" width="1200" height="675" loading="lazy" /><figcaption>All eight styles, using the same game interface.</figcaption></figure>

    <h2>Turn up the colour with Neon Lights</h2>
    <p>Our newest look swaps metallic edges for colourful light-tube frames. Pink, cyan and lime outlines glow around the panels, while the lettering looks like a brightly lit shop sign. Dark backgrounds keep the questions and scores clear. It is a permanent style you can choose in setup or from the cog menu during a game.</p>

    <h2>A Halloween cabinet with a few surprises</h2>
    <p>Halloween goes beyond changing the colours. Shaded spiders crawl across the board with moving legs and cast shadows. Ghosts occasionally pop up, lunge forward and fade away. Drifting fog, watching eyes, passing bats and glowing pumpkins complete the haunted look.</p>
    <p>The decorations let clicks pass through to the game controls. The travelling creatures and ghost scares are hidden when your device's reduced-motion setting is enabled, and the effects stop when you switch to another style.</p>
    <p><strong>Halloween is a seasonal option, available to choose through 1 November 2026.</strong> After that, it will leave the choices for new games. Games already saved with Halloween will keep their chosen look.</p>

    <h2>How to choose a style</h2>
    <ol>
      <li>Open a game and go to its setup screen.</li>
      <li>Find <strong>Game style</strong> and open the dropdown. Each option includes a small visual preview.</li>
      <li>Choose a look and start playing. New games begin with <strong>Classic</strong> as the default.</li>
    </ol>
    <p>Want to change the atmosphere halfway through a lesson? Open the <strong>cog menu</strong> during the game and choose another style. You can switch looks without restarting the activity or losing the scores.</p>

    <h2>Which games can use the styles?</h2>
    <p>The style picker is available in <strong>Trivia, Jeopardy, Pub Quiz, Darts Challenge, Snakes &amp; Ladders, Stop the Fire, Word Wheel, Block Beaters and Plinkemoji</strong>. It works on desktop and mobile, with the layout adapting to the screen.</p>
    <p>Try a comic look for a lively team quiz, chrome for an arcade challenge, or let the class pick a favourite. For a Halloween lesson, there is a haunted board waiting for you.</p>
    <p><a href="/games">Browse the games and try a new style</a>.</p>
  `,
};

export const spanishGameStylesBlogPost: Pick<BlogPost, 'title' | 'subtitle' | 'date' | 'content'> = {
  title: 'Ocho estilos para tus juegos de clase, incluido Halloween',
  subtitle: 'Elige un estilo para tu clase, cámbialo durante la partida y descubre nuestra sorpresa de Halloween.',
  date: '23 de octubre de 2026',
  content: `
    <p class="lead">Tus juegos de clase estrenan vestuario. Ahora puedes elegir entre ocho estilos visuales: desde el azul y amarillo de Classic hasta el neón de Pinball Chrome, pasando por un Halloween con visitantes inesperados.</p>
    <p>El estilo cambia el aspecto de los paneles, las tarjetas de preguntas, el marcador, los botones y los menús. Las preguntas, los puntos y las reglas siguen igual, así que puedes renovar una actividad que ya te funciona sin prepararla de nuevo.</p>

    <h2>Encuentra el estilo favorito de tu clase</h2>
    <ul>
      <li><strong>Classic:</strong> nuestro azul y amarillo habitual, con una presentación clara y sencilla.</li>
      <li><strong>Comic Pop:</strong> contornos marcados, colores vivos y un aire de cómic.</li>
      <li><strong>Pinball Chrome:</strong> bordes metálicos, paneles oscuros y detalles de neón para dar ambiente de recreativos.</li>
      <li><strong>Toy Blocks:</strong> paneles de bloques de construcción, con pequeños salientes y bordes en relieve.</li>
      <li><strong>Paper Cut:</strong> capas de papel, contornos verde azulado y detalles coral.</li>
      <li><strong>Candy Circuit:</strong> paneles rosas y crema, esquinas redondeadas y detalles de colores de caramelo.</li>
      <li><strong>Halloween:</strong> naranja y negro, telarañas, calabazas, murciélagos y visitantes que se mueven por la pantalla.</li>
      <li><strong>Neon Lights:</strong> marcos rosas, cian y lima, letras luminosas y un aire de rótulo de neón sobre fondo oscuro.</li>
    </ul>

    <figure><img src="/assets/blog-game-styles.webp" alt="Vistas previas de Classic, Comic Pop, Pinball Chrome, Toy Blocks, Paper Cut, Candy Circuit, Halloween y Neon Lights" width="1200" height="675" loading="lazy" /><figcaption>Los ocho estilos, con la misma interfaz de juego.</figcaption></figure>

    <h2>Más color con Neon Lights</h2>
    <p>El estilo más reciente cambia los bordes metálicos por marcos de tubos luminosos. Los contornos rosas, cian y lima brillan alrededor de los paneles, y las letras recuerdan a un rótulo de neón. Los fondos oscuros mantienen claras las preguntas y los puntos. Es un estilo permanente que puedes elegir en la configuración o en el menú del engranaje durante la partida.</p>

    <h2>Un tablero de Halloween con sorpresas</h2>
    <p>Halloween no se limita a cambiar los colores. Las arañas recorren el tablero moviendo las patas, con sombreado y sombras que les dan volumen. De vez en cuando aparecen fantasmas que se acercan a la pantalla y se desvanecen. La niebla, los ojos que observan, los murciélagos y las calabazas iluminadas completan el ambiente.</p>
    <p>Las decoraciones dejan pasar los clics a los controles del juego. Si tu dispositivo tiene activada la opción de reducir el movimiento, los personajes que recorren la pantalla y los sustos de los fantasmas se ocultan. Los efectos se detienen al cambiar de estilo.</p>
    <p><strong>Halloween es una opción de temporada que se puede elegir hasta el 1 de noviembre de 2026.</strong> Después dejará de aparecer entre las opciones de los juegos nuevos. Los juegos que ya hayas guardado con Halloween conservarán ese aspecto.</p>

    <h2>Cómo elegir un estilo</h2>
    <ol>
      <li>Abre un juego y entra en su pantalla de configuración.</li>
      <li>Busca <strong>Estilo del juego</strong> y abre el desplegable. Cada opción incluye una pequeña vista previa.</li>
      <li>Elige un estilo y empieza a jugar. Los juegos nuevos usan <strong>Classic</strong> de forma predeterminada.</li>
    </ol>
    <p>¿Quieres cambiar de ambiente a mitad de la clase? Abre el <strong>menú del engranaje</strong> durante la partida y elige otro estilo. Puedes cambiar el aspecto sin reiniciar la actividad ni perder los puntos.</p>

    <h2>¿En qué juegos están disponibles?</h2>
    <p>El selector está disponible en <strong>Trivia, Jeopardy, Pub Quiz, Darts Challenge, Snakes &amp; Ladders, Stop the Fire, Word Wheel, Block Beaters y Plinkemoji</strong>. Funciona tanto en ordenador como en móvil, con una distribución adaptada a la pantalla.</p>
    <p>Prueba el estilo de cómic para un concurso por equipos, el cromado para un reto de recreativos o deja que la clase elija su favorito. Para una sesión de Halloween, ya tienes un tablero encantado esperando.</p>
    <p><a href="/games">Explora los juegos y prueba un estilo nuevo</a>.</p>
  `,
};
