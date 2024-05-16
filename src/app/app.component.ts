import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';

interface Employee {
  employeeCode: string;
  startTime: string;
  endTime: string;
}

interface ProcessedEmployee {
  employeeCode: string;
  startTime: number;
  endTime: number;
}

interface EmployeeSchedule {
  employeeCode: string;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  // Your component logic here
  employees: Employee[] = [
    { employeeCode: 'E0', startTime: '8:00', endTime: '17:00' },
    { employeeCode: 'E1', startTime: '8:00', endTime: '11:00' },
    { employeeCode: 'E2', startTime: '10:00', endTime: '16:00' }
  ];

  minTime = 5;
  maxTime = 21;
  pendingChanges: EmployeeSchedule[] = [];
  data: EmployeeSchedule[][] = [];
  processedEmployees: ProcessedEmployee[] = [];

  constructor() { }

  ngOnInit(): void {
    this.processData();
    this.drawChart();
  }

  processData(): void {
    this.processedEmployees = this.employees.map(emp => ({
      employeeCode: emp.employeeCode,
      startTime: +emp.startTime.split(':').reduce((h, m) => (Number(h) * 60 + Number(m)).toString()),
      endTime: +emp.endTime.split(':').reduce((h, m) => (Number(h) * 60 + Number(m)).toString()),
    }));

    this.processedEmployees.sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);

    const lines: ProcessedEmployee[][] = [];
    for (const emp of this.processedEmployees) {
      const line = lines.find(line => line[line.length - 1].endTime <= emp.startTime);
      if (line) {
        line.push(emp);
      } else {
        lines.push([emp]);
      }
    }

    this.data = lines.map(line =>
      line.map(emp => ({
        employeeCode: emp.employeeCode,
        startTime: `${Math.floor(emp.startTime / 60)}:${emp.startTime % 60 === 0 ? '00' : (emp.startTime % 60).toString()}`,
        endTime: `${Math.floor(emp.endTime / 60)}:${emp.endTime % 60 === 0 ? '00' : (emp.endTime % 60).toString()}`,
      }))
    );
  }

  updateData(draggedBlock: EmployeeSchedule): void {
    this.pendingChanges.push(draggedBlock);
  }

  saveChanges(): void {
    this.pendingChanges.forEach(change => {
      const updatedEmployees: Employee[] = this.data.flat().map(emp => ({
        employeeCode: emp.employeeCode,
        startTime: `${Math.floor(parseInt(emp.startTime.split(':')[0]))}:${emp.startTime.split(':')[1]}`,
        endTime: `${Math.floor(parseInt(emp.endTime.split(':')[0]))}:${emp.endTime.split(':')[1]}`
      }));

      this.employees = updatedEmployees;
      this.processData();
    });

    this.pendingChanges = [];
    this.drawChart();
  }

  drawChart(): void {
    d3.select("#chart").html("");
    d3.select("#chart").style("display", "flex");

    const groupSvg = d3.select("#chart").insert("svg", ":first-child")
      .attr("width", 100)
      .attr("height", this.data.length * 30 + 50);

    groupSvg.append("text")
      .attr("x", 50)
      .attr("y", this.data.length * 15 + 40)
      .text("Group 1")
      .attr("font-family", "sans-serif")
      .attr("font-size", "20px")
      .attr("fill", "black")
      .attr("text-anchor", "middle");

    const svg = d3.select("#chart").append("svg")
      .attr("width", (this.maxTime - this.minTime) * 40)
      .attr("height", this.data.length * 30 + 50);

    for (let i = this.minTime; i <= this.maxTime; i++) {
      svg.append("line")
        .attr("x1", (i - this.minTime) * 40)
        .attr("y1", 0)
        .attr("x2", (i - this.minTime) * 40)
        .attr("y2", this.data.length * 30 + 50)
        .attr("stroke", "black")
        .attr("stroke-width", 1);
    }

    for (let i = 0; i <= this.data.length; i++) {
      svg.append("line")
        .attr("x1", 0)
        .attr("y1", i * 30 + 50)
        .attr("x2", (this.maxTime - this.minTime) * 40)
        .attr("y2", i * 30 + 50)
        .attr("stroke", "black")
        .attr("stroke-width", 1);
    }

    for (let i = this.minTime; i <= this.maxTime; i++) {
      svg.append("text")
        .attr("x", (i - this.minTime) * 40 + 20)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .text(`${i}:00`);
    }

    const rows = svg.selectAll("g")
      .data(this.data)
      .enter().append("g")
      .attr("transform", (d, i) => `translate(0,${i * 30 + 50})`);

    rows.each((rowData, i, nodes) => {
      const row = d3.select(nodes[i]);
      const rects = row.selectAll("rect")
        .data(rowData)
        .enter().append("rect")
        .attr("x", d => (parseInt(d.startTime.split(':')[0]) - this.minTime) * 40)
        .attr("width", d => (parseInt(d.endTime.split(':')[0]) - parseInt(d.startTime.split(':')[0])) * 40)
        .attr("height", 20)
        .attr("fill", "steelblue");

      const texts = row.selectAll("text")
        .data(rowData)
        .enter().append("text")
        .attr("x", d => (parseInt(d.startTime.split(':')[0]) - this.minTime) * 40 + 5)
        .attr("y", 15)
        .text(d => d.employeeCode);

      const self = this;

      rects.call(d3.drag<SVGRectElement, EmployeeSchedule>()
        .on("start", function (event: any) {
          d3.select(this).raise().classed("active", true);
        })
        .on("drag", function (event: any, d: EmployeeSchedule) {
          const x = event.x;
          const width = parseInt(d3.select(this).attr("width") || '0');
          const startX = parseInt(d3.select(this).attr("x") || '0');
          const endX = startX + width;
          if (Math.abs(x - startX) < Math.abs(x - endX)) {
            const newStart = Math.max(0, Math.min(endX, x));
            d3.select(this).attr("x", newStart);
            d3.select(this).attr("width", endX - newStart);
            d.startTime = `${Math.floor(newStart / 40) + self.minTime}:00`;
            texts.filter(t => t.employeeCode === d.employeeCode)
              .attr("x", newStart + 5);
          } else {
            const newEnd = Math.max(startX, Math.min(800, x));
            d3.select(this).attr("width", newEnd - startX);
            d.endTime = `${Math.floor(newEnd / 40) + self.minTime}:00`;
            texts.filter(t => t.employeeCode === d.employeeCode)
              .attr("x", startX + 5);
          }
        })
        .on("end", function (event: any, d: EmployeeSchedule) {
          d3.select(this).classed("active", false);
          self.updateData(d);
        })
      );
    });
  }
}