/* Silicon Serf: the people, the words, the places, the home screen.
   KT Silicon Labs and everyone in it are fictional. */

/* Home screen */
HOME.title = 'Silicon Serf';
HOME.sub = 'Your first four weeks as a chip front-end engineer';
HOME.fine = 'A story game made with the fab24hr engine. KT Silicon Labs and everyone in it are fictional.';
HOME.support = null;

/* Who is in the game.
   STORY.cast: how they appear in the dialogue box and the codex (about = codex text).
   WORLD.cast: their body in the 3D scene (Marvin from IT only ever phones). */
STORY.cast = {
  me: {name: 'You', role: 'RTL design engineer, first week', tag: 'YOU', color: '#c98a00'},
  kln: {name: 'KLN', role: 'RTL design lead', tag: 'LEAD', color: '#1f5f8b', about: 'Leads the RTL team and reviews every line that goes into the chip. Reads Verilog the way other people read the news.'},
  skg: {name: 'SKG', role: 'Verification engineer', tag: 'DV', color: '#2b8a57', about: 'Writes the testbenches that try to break your design. Finding your bug is the job, not a personal attack.'},
  qyl: {name: 'QYL', role: 'Chip architect', tag: 'ARCH', color: '#7a4bb3', about: 'Wrote the spec for the peripheral block you are building. Knows why every register bit exists.'},
  jjy: {name: 'JJY', role: 'Synthesis and timing engineer', tag: 'STA', color: '#c0621d', about: 'Turns RTL into gates and makes sure every path in the chip is fast enough, and not too fast. Speaks fluent nanoseconds.'},
  wsl: {name: 'WSL', role: 'Analog design engineer', tag: 'AMS', color: '#0f7f80', about: 'Designs the parts of the chip that are not ones and zeros: the reference, the ADC, the pads. Lives at the lab bench, next to a soldering iron and an oscilloscope.'},
  jjh: {name: 'JJH', role: 'DFT engineer', tag: 'DFT', color: '#b8336a', about: 'Design for test: makes sure every chip that comes out of the factory can be checked, and every broken one caught. Thinks in scan chains and fault coverage.'},
  kt: {name: 'KT', role: 'CEO', tag: 'CEO', color: '#b2382f', about: 'Founded KT Silicon Labs. Still walks the floor every week and remembers everyone\'s first block.'},
  marvin: {name: 'Marvin', role: 'IT support, on the phone', tag: 'IT', color: '#55616b', about: 'Sets up accounts, licences and laptops. Mostly heard, rarely seen.'}
};
WORLD.cast = {
  me: {label: 'You · RTL engineer', fill: '#f2b01e', ink: '#231800', cloth: 0x3b4a5a, color: 0xc98a00, hair: 0x2b2320, node: 'start', face: Math.PI},
  kln: {label: 'KLN · RTL lead', fill: '#1f5f8b', ink: '#ffffff', cloth: 0x2d3e50, color: 0x1f5f8b, hair: 0x1c1c1c, node: 'kln', face: 0},
  skg: {label: 'SKG · Verification', fill: '#2b8a57', ink: '#ffffff', cloth: 0x4f6b3a, color: 0x2b8a57, hair: 0x3a2618, node: 'skg', face: 0},
  qyl: {label: 'QYL · Architect', fill: '#7a4bb3', ink: '#ffffff', cloth: 0x6b5a7a, color: 0x7a4bb3, hair: 0x14100e, long: true, node: 'qyl', face: 0},
  jjy: {label: 'JJY · Synthesis & timing', fill: '#c0621d', ink: '#ffffff', cloth: 0x7a4a2a, color: 0xc0621d, hair: 0x241a12, node: 'jjy', face: 0},
  wsl: {label: 'WSL · Analog design', fill: '#0f7f80', ink: '#ffffff', cloth: 0x2f6f70, color: 0x0f7f80, hair: 0x1c1410, node: 'wsl', face: Math.PI},
  jjh: {label: 'JJH · DFT', fill: '#b8336a', ink: '#ffffff', cloth: 0x6a2a44, color: 0xb8336a, hair: 0x2a1c14, node: 'jjh', face: Math.PI},
  kt: {label: 'KT · CEO', fill: '#b2382f', ink: '#ffffff', cloth: 0x22262b, color: 0xb2382f, hair: 0x2a2a2a, node: 'ceo', face: 0}
};

/* Places you walk to (not people). at = where you stand to use it; mark = where the "!" floats. */
STORY.places = {
  mydesk: {name: 'Your desk', at: [-.4, 3.7], mark: [-.4, 2.4, 2.3], go: 'Go to your desk'},
  fpga: {name: 'FPGA bench', at: [6, -4.1], mark: [6, 2.3, -5.4], go: 'Go to the FPGA bench'},
  pantry: {name: 'Pantry', at: [7, -0.6], mark: [8.3, 2.4, -0.6], go: 'Go to the pantry'}
};

/* Words players can tap for a plain explanation. [word, explanation]. Alternative spellings: separate with " / ". */
const GLOSS = [
  ['RTL', 'Register-transfer level: describing a chip as registers (memory that updates on a clock tick) and the logic between them. It is the code a front-end designer writes.'],
  ['Verilog', 'A hardware description language. It looks like a programming language, but each line becomes wires and gates, and they all run at the same time.'],
  ['Front-end', 'The half of chip design that decides what the chip does: architecture, RTL code and verification. The back-end turns that into a physical layout.'],
  ['Spec / specification', 'The document that says exactly how a block must behave. If the code and the spec disagree, the code is wrong.'],
  ['APB', 'Advanced Peripheral Bus: a simple, slow bus the processor uses to read and write the settings of small blocks such as timers and serial ports.'],
  ['Requester', 'The side of a bus that starts a transfer, usually a bridge from the processor.'],
  ['Completer', 'The side of a bus that answers a transfer. Your register block is one.'],
  ['PSEL', 'The APB signal that says "this transfer is for you". Each block on the bus gets its own.'],
  ['PENABLE', 'The APB signal that is 0 in the first cycle of a transfer and 1 in the second. It tells the two phases apart.'],
  ['SETUP', 'The first cycle of an APB transfer: address and data are on the bus, but nothing happens yet.'],
  ['ACCESS', 'The second cycle of an APB transfer. The transfer completes on the clock edge at the end of it.'],
  ['IDLE', 'A bus cycle with no transfer for you.'],
  ['PRDATA', 'The data your block sends back on an APB read. It must be correct during the ACCESS cycle, because that is when it is sampled.'],
  ['PSLVERR', 'The APB error signal. A block raises it in the ACCESS cycle to say "this transfer failed", for example a write to a read-only register.'],
  ['Register', 'A small piece of memory inside the chip, made of flip-flops, that keeps its value until the next clock edge changes it.'],
  ['Clock edge / rising edge', 'The instant the clock goes from 0 to 1. Every register in the design updates at that instant, all together.'],
  ['Combinational', 'Logic with no memory: its output follows its inputs right away, without waiting for a clock edge.'],
  ['Non-blocking assignment / non-blocking', 'The Verilog "<=" used for registers. All of them take effect together at the clock edge; if one register gets two of them, the last one written wins.'],
  ['Interrupt / IRQ', 'A signal that makes the processor stop what it is doing and handle an event, such as data arriving.'],
  ['Write 1 to clear / write-1-to-clear', 'A register rule: writing a 1 to a bit clears it, writing a 0 leaves it alone. Used so software can acknowledge one event without touching the others.'],
  ['Byte strobe / PSTRB', 'One bit per byte of write data. A 1 means "write this byte"; a 0 means "leave it alone".'],
  ['Latch', 'A storage element that follows its input while its enable is on and holds the value while it is off. Usually created by accident in combinational code that forgets to assign an output.'],
  ['Flip-flop / flip-flops', 'The basic storage element of a chip: it stores one bit and changes only on a clock edge.'],
  ['Testbench', 'Code that drives a design with inputs and checks its outputs in simulation. It never becomes part of the chip.'],
  ['Assertion', 'A rule written next to the design and checked automatically on every clock edge of every test, e.g. "PRDATA must be right in the ACCESS cycle of a read".'],
  ['Coverage / cover point', 'A count of which situations the tests actually reached. Passing tests prove nothing about a case they never reached.'],
  ['Corner case', 'A rare combination of events, such as a clear and a new interrupt on the same clock edge. Where bugs like to hide.'],
  ['Synthesis / logic synthesis', 'The tool step that turns RTL into a netlist of real logic gates and flip-flops from a cell library, while trying to meet the timing constraints.'],
  ['Netlist', 'The output of synthesis: a list of gates and flip-flops and the wires between them.'],
  ['Cell library', 'The catalogue of gates the factory can build (AND, OR, flip-flops…), each with a known size, power and delay.'],
  ['Constraint / constraints / SDC', 'Instructions to synthesis and timing tools, written in SDC (Synopsys Design Constraints format): how fast the clock is, when inputs arrive, which paths to ignore.'],
  ['Clock period', 'The time between two rising clock edges. 1 divided by the clock frequency: 200 MHz gives 5 ns.'],
  ['Input delay', 'How long after the clock edge a signal arrives at an input port, because it comes through logic outside the block.'],
  ['STA / static timing analysis', 'Checking every timing path in the design by calculation instead of simulation, to prove the chip works at its clock speed.'],
  ['Timing path', 'A route from where data starts (a flip-flop or an input) through logic to where it is captured (a flip-flop or an output).'],
  ['Slack', 'Spare time on a timing path. Positive: it meets timing with time to spare. Negative: a violation that must be fixed.'],
  ['Setup time / setup check / setup slack', 'Data must arrive a little before the clock edge that captures it. A setup violation means a path is too slow for the clock.'],
  ['Hold time / hold check / hold slack', 'Data must stay stable a little after the clock edge. A hold violation means a path is too fast, and does not depend on the clock speed.'],
  ['Clock-to-Q', 'How long after the clock edge a flip-flop\'s output changes.'],
  ['Clock uncertainty', 'A safety margin for clock jitter and other unknowns, taken off the time available on every path.'],
  ['Clock skew / skew', 'The difference in when the clock edge reaches two flip-flops, because the clock travels along wires of different lengths.'],
  ['Pipeline register / pipeline', 'An extra flip-flop stage added in the middle of slow logic, so each half gets a full clock cycle. Costs one cycle of latency.'],
  ['Latency', 'How many clock cycles a result takes to come out.'],
  ['Simulation / simulator', 'Running the design as software, cycle by cycle, before anything is built.'],
  ['Waveform', 'A picture of signals over time, one row per signal, one column per clock cycle. Where most bugs are found.'],
  ['Regression', 'The full set of tests, run again after every change, to make sure nothing that used to work has broken.'],
  ['Lint', 'A tool that reads your code and flags suspicious patterns before you simulate: unused signals, two drivers on one wire, widths that do not match.'],
  ['Code review', 'A teammate reads your change before it is merged. Normal, expected, and nothing personal.'],
  ['Merge / merged', 'Adding your change to the team\'s shared code, so everyone builds on it.'],
  ['FPGA', 'A chip whose logic can be reprogrammed. Teams load their design onto one to try it at real speed long before the real chip exists.'],
  ['Bitstream', 'The file that programs an FPGA with your design.'],
  ['Tape-out', 'Sending the finished design to the factory to be made. After it, mistakes cost months and millions.'],
  ['Analog', 'Circuits that work with continuous voltages and currents instead of ones and zeros: references, amplifiers, converters, the pads where the chip meets the board.'],
  ['Evaluation board / EVB', 'A circuit board made to try a new chip in real conditions: a battery, sensors, buttons, connectors.'],
  ['ADC', 'Analog-to-digital converter: measures a voltage and turns it into a number the logic can read. Anything above its full-scale voltage reads as the maximum.'],
  ["Ohm's law", 'V = I × R: the voltage across a resistor is the current through it times its resistance.'],
  ['Voltage divider / divider', 'Two resistors in series. The point between them sits at a fixed fraction of the voltage across both: R2 / (R1 + R2).'],
  ['Transistor', 'The switch every chip is built from. A modern chip has billions of them.'],
  ['NMOS', 'A transistor that conducts when its gate is 1. Good at pulling a node down to ground.'],
  ['PMOS', 'A transistor that conducts when its gate is 0. Good at pulling a node up to VDD.'],
  ['CMOS', 'Logic built from PMOS switches to VDD and NMOS switches to ground. For every input exactly one side conducts, so almost no current flows while nothing changes.'],
  ['VDD', 'The positive supply voltage of a chip or a board.'],
  ['I²C / I2C', 'A two-wire bus, SDA for data and SCL for the clock, that chips on a board use to talk to sensors and other small parts.'],
  ['Open drain / open-drain', 'An output that can only pull a line low or let go of it. Something else, a pull-up resistor, has to bring the line back up.'],
  ['Pull-up / pull-up resistor', 'A resistor from a line to VDD that holds the line at 1 whenever nothing pulls it low.'],
  ['Rise time', 'How long a signal takes to go from low to high, usually measured between 30% and 70%, or 10% and 90%, of the swing.'],
  ['Contact bounce / bounce', 'When a mechanical button closes, its contacts bounce apart and together for a few milliseconds, so one press looks like several.'],
  ['Low-pass filter', 'A circuit that lets slow changes through and smooths away fast ones. A resistor in series and a capacitor to ground is the simplest one.'],
  ['Time constant', 'R × C, written τ: roughly how long an RC circuit takes to follow a change. After one time constant it has gone 63% of the way.'],
  ['Cutoff frequency', 'The frequency where a filter starts to cut: 1 / (2π × R × C) for an RC filter.'],
  ['Schmitt trigger', 'An input with two thresholds, a higher one for rising and a lower one for falling, so a slow or noisy edge switches it only once.'],
  ['Synchronizer', 'Two flip-flops in a row on the receiving clock. A signal from outside that clock may leave the first one metastable; the second gives it a whole cycle to settle.'],
  ['Metastable / metastability', 'What a flip-flop does when its input changes right at the clock edge: its output can hover between 0 and 1 for a while before it settles.'],
  ['Op-amp / operational amplifier', 'An amplifier with a + and a − input and a huge gain. With feedback to the − input, it moves its output until both inputs are at the same voltage.'],
  ['Feedback', "Taking part of a circuit's output back to its input. Negative feedback, to the − input, makes an amplifier steady and precise."],
  ['DFT / design for test', 'Design for test: extra logic added to a chip so that the factory can check each chip it makes. Scan chains, test patterns, memory self-test.'],
  ['Stuck-at fault / stuck-at / stuck at', 'The simplest model of a manufacturing defect: one wire behaves as if it were tied to 0 (stuck-at-0) or to 1 (stuck-at-1).'],
  ['Scan flip-flop / scan flop', 'A flip-flop with a 2-to-1 mux in front: in test it can take its value from the flop before it instead of from the logic.'],
  ['Scan chain', 'Scan flip-flops connected output to input, so in test mode they form one long shift register the tester can load and read.'],
  ['Scan enable / SE', 'The signal that switches every scan flip-flop from normal use to shifting along its chain.'],
  ['ATPG', 'Automatic test pattern generation: a tool that finds, for each possible fault, inputs that make a broken chip answer differently from a good one.'],
  ['Test pattern', 'One set of values shifted into the chains and applied to the inputs, with the answer a good chip must give.'],
  ['Fault coverage', 'The share of all modelled faults that at least one test pattern catches. Sign-off usually wants 95% or more.'],
  ['Tester / ATE', 'The machine in the factory that runs the test patterns on every chip and sorts the good ones from the broken ones.'],
  ['Test mode / test_mode', 'A signal that is 1 only while the chip is on the tester. Logic that would get in the way of test, like an internal reset, is bypassed with it.'],
  ['DRC', 'Design rule check. In DFT: a check that every flip-flop can be controlled and observed by the tester, for example that no reset comes from inside the chip.'],
  ['MBIST / memory BIST / BIST', 'Built-in self-test: a small engine on the chip that writes and reads test patterns into a memory at full speed, then reports pass or fail.'],
  ['March test', 'The usual memory test: walk through every address writing and reading 0s and 1s, up the addresses and then down.'],
  ['JTAG', "Four or five pins (TCK, TMS, TDI, TDO) that give a tester or a board access to a chip's test logic, even after it is soldered down."],
  ['Boundary scan', 'A scan chain around the pins of a chip, reached through JTAG, that can check the solder joints of a board pin by pin.']
];
termsSet(GLOSS, ' / ', [['scan chains', 'Scan chain'], ['scan flip-flops', 'Scan flip-flop'], ['test patterns', 'Test pattern'], ['testers', 'Tester'], ['stuck-at-0', 'Stuck-at fault'], ['stuck-at-1', 'Stuck-at fault'], ['registers', 'Register'], ['testbenches', 'Testbench'], ['waveforms', 'Waveform'], ['interrupts', 'Interrupt'], ['IRQs', 'IRQ'], ['specs', 'Spec'], ['FPGAs', 'FPGA'], ['latches', 'Latch'], ['assertions', 'Assertion'], ['netlists', 'Netlist'], ['timing paths', 'Timing path'], ['corner cases', 'Corner case'], ['transistors', 'Transistor'], ['pull-ups', 'Pull-up'], ['op-amps', 'Op-amp'], ['ADCs', 'ADC']], []);
